// src/core/session.mjs — 金库会话：首次设置 / 解锁 / 记录存取 / 锁定（node 端到端可测）
// 整合 kdf + keys + aead + hashchain。DEK 仅驻内存，锁定即丢弃引用。
import { randomSalt, KDF_PARAMS } from './kdf.mjs';
import {
  deriveRawKey, deriveKEK, generateSecretKey, generateDEK,
  wrapDEK, unwrapDEK, secretKeyToBase32, base32ToSecretKey,
} from './keys.mjs';
import { buildAAD, encryptRecord, decryptRecord } from './aead.mjs';
import { recordHash, verifyChain, GENESIS } from './hashchain.mjs';

const enc = new TextEncoder();
const dec = new TextDecoder();

// 首次设置：生成 Secret Key(恢复码) → KEK → 封装 DEK → 存 meta。返回恢复码与内存会话。
export async function setupVault(store, { masterPassword, vaultId = 'v1', deviceId = 'd1' }) {
  const salt = randomSalt();
  const raw = deriveRawKey(masterPassword, salt);
  const secretKey = generateSecretKey();
  const kek = deriveKEK(raw, secretKey);
  const dek = generateDEK();
  const aad = buildAAD({ vaultId, deviceId, schema: 1, kdf: KDF_PARAMS });
  const wrapped_dek = wrapDEK(dek, kek, aad);
  const meta = {
    vaultId, deviceId, salt, kdf: KDF_PARAMS,
    wrapped_dek, segment_id: 0, count: 0, head_hash: GENESIS,
  };
  await store.saveMeta(meta);
  await store.saveShard(deviceId, []);
  return {
    recoveryCode: secretKeyToBase32(secretKey),
    meta,
    session: { vaultId, deviceId, dek, secretKey },
  };
}

// 解锁：主密码始终必填（ADR-022 恢复码不能单独解锁）。
// Secret Key 可来自手输 26 位恢复码，或本机 IndexedDB 便利副本（ADR-015 / FR-K2）。
// ADR-008：密码错 / 恢复码错 / 数据损坏统一抛 E_UNLOCK，不区分，避免泄露「密码是否猜对」。
export async function unlockVault(store, { masterPassword, recoveryCode, secretKey, deviceId }) {
  const meta = await store.loadMeta();
  if (!meta) throw new Error('E_NO_VAULT');
  let sk = secretKey;
  if (!sk) {
    if (!recoveryCode) throw new TypeError('unlockVault 需要 recoveryCode 或 secretKey');
    sk = base32ToSecretKey(recoveryCode);
  }
  if (!(sk instanceof Uint8Array) || sk.length !== 16) throw new Error('E_UNLOCK');
  const raw = deriveRawKey(masterPassword, meta.salt);
  const kek = deriveKEK(raw, sk);
  // AAD 与分片键一律绑定本机金库的 meta.deviceId（来源设备的 deviceId 已固化进 meta）。
  // 切勿用传入的 deviceId 取分片：跨设备恢复后两者会错位，会读到错误/空/旧分片导致误报「数据损坏」。
  const aad = buildAAD({ vaultId: meta.vaultId, deviceId: meta.deviceId, schema: 1, kdf: meta.kdf });
  let dek;
  try {
    dek = unwrapDEK(meta.wrapped_dek, kek, aad);
  } catch {
    throw new Error('E_UNLOCK');
  }
  const records = await store.loadShard(meta.deviceId);
  const v = verifyChain(records, {
    vaultId: meta.vaultId, deviceId: meta.deviceId, segment_id: meta.segment_id,
  });
  if (!v.ok) throw new Error('E_INTEGRITY_FAIL');
  return { dek, head_hash: v.head_hash, max_sequence: v.max_sequence, secretKey: sk };
}

// 新增记录：加密 + 接哈希链 + 推进水位（meta.count / head_hash）。
export async function addRecord(store, session, { plaintext }) {
  const meta = await store.loadMeta();
  const { vaultId, deviceId, segment_id } = meta;
  const records = await store.loadShard(deviceId);
  const seq = records.length;
  const prev = seq === 0 ? GENESIS : records[seq - 1].record_hash;
  const aad = buildAAD({ vaultId, deviceId, schema: 1, kdf: meta.kdf });
  const ptBytes = enc.encode(JSON.stringify(plaintext));
  const { nonce, ct } = encryptRecord(ptBytes, session.dek, { aad });
  const record_hash = recordHash({
    vaultId, deviceId, segment_id, sequence: seq, prev_hash: prev, nonce, ciphertext: ct,
  });
  const rec = { sequence: seq, prev_hash: prev, nonce, ciphertext: ct, record_hash };
  records.push(rec);
  await store.saveShard(deviceId, records);
  meta.count = records.length;
  meta.head_hash = record_hash;
  await store.saveMeta(meta);
  return rec;
}

// 锁定：丢弃 DEK / Secret Key 引用（应用层负责后续缓冲区覆写）。
export function lock(session) {
  session.dek = null;
  session.secretKey = null;
}

// 加载全部条目（解密 + 按 id 取最新版本）。tombstone（deleted:true）的版本标记 deleted。
// 内部已先 verifyChain 校验哈希链完整性。
export async function loadEntries(store, session) {
  const meta = await store.loadMeta();
  const { vaultId, deviceId, segment_id } = meta;
  const records = await store.loadShard(deviceId);
  const v = verifyChain(records, { vaultId, deviceId, segment_id });
  if (!v.ok) throw new Error('E_INTEGRITY_FAIL');
  const aad = buildAAD({ vaultId, deviceId, schema: 1, kdf: meta.kdf });
  const latest = new Map();
  for (const rec of records) {
    const ptBytes = decryptRecord({ nonce: rec.nonce, ct: rec.ciphertext }, session.dek, aad);
    const pt = JSON.parse(dec.decode(ptBytes));
    const id = pt.id;
    const seq = rec.sequence;
    if (!latest.has(id) || seq > latest.get(id)._seq) {
      latest.set(id, { ...pt, _seq: seq });
    }
  }
  // 归一化：保证每条目都带 tags/fav/deleted 等基础字段，避免下游对
  // 缺字段记录（如 tombstone 删除记录 {id,deleted:true}）调用 e.tags 时崩溃。
  const base = { tags: [], fav: false, deleted: false };
  return [...latest.values()].map(({ _seq, ...rest }) => ({ ...base, ...rest }));
}

// 编辑：强制带 id，append 一条新版本（哈希链连续递增）。旧版本仍留痕，解密时取最新。
export async function updateRecord(store, session, { id, plaintext }) {
  return addRecord(store, session, { plaintext: { ...plaintext, id } });
}

// 删除：append 一条 tombstone 记录（deleted:true）。解密层据此标记 deleted，不入列表主视图。
export async function deleteRecord(store, session, { id }) {
  return addRecord(store, session, { plaintext: { id, deleted: true } });
}
