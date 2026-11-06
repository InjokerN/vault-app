// src/core/backup.mjs — 导出 / 导入加密备份、重新生成恢复码
// 规格：AGENT.md ② §3「加密备份格式」、ADR-020 / ADR-021、FR-SET2 / FR-SET3 / FR-K5、§5 验收第 8 条。
// 纯函数式，node 侧可测；不直接依赖任何浏览器 API。
//
// 设计要点：
//  · head 明文且自包含 wrapped_dek —— 本地数据清空后仍能靠「主密码 + 恢复码」解开 DEK
//  · payload 用 k_backup（从 DEK 派生的用途分离子密钥）再封一层，与记录密文格式不通用（ADR-021）
//  · 备份不含恢复码（Q11）；digest 先校验再解密，损坏明确报错、绝不静默清库（规则 6）
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { blake2b } from '@noble/hashes/blake2.js';
import { equalBytes } from '@noble/ciphers/utils.js';
import { encryptRecord, decryptRecord, buildAAD } from './aead.mjs';
import {
  deriveRawKey, deriveKEK, wrapDEK, unwrapDEK,
  generateSecretKey, secretKeyToBase32, base32ToSecretKey,
} from './keys.mjs';
import { verifyChain, bytesToHex } from './hashchain.mjs';

const enc = new TextEncoder();
const dec = new TextDecoder();

// ADR-021：k_backup 从 DEK 派生，用途与「记录加密用的 DEK」分离。
// [未确认] 规格只要求用途分离，未规定常量；以下为推荐值，改动会使旧备份不可读。
const BK_SALT = enc.encode('vault/backup/salt/v1');
const BK_INFO = enc.encode('vault/backup/v1');
function deriveBackupKey(dek) {
  return hkdf(sha256, dek, BK_SALT, BK_INFO, 32);
}

// AAD 绑定规范化的 head，防止把别处密文替换进来 / 参数降级
function backupAAD(head) {
  return enc.encode('vault-backup:v1|' + JSON.stringify(head));
}

// [未确认] 容器为 JSON、摘要为 BLAKE2b-256。输入含 canonical(head)，任何字段被改都 detectable。
function digestOf(file) {
  const s = [
    file.format, String(file.schema), file.created,
    JSON.stringify(file.head), file.nonce, file.payload,
  ].join('|');
  // BLAKE2b-256：@noble/hashes 的 blake2b 默认输出 64B，须显式 dkLen:32 才与规格 <hex 64> 一致
  return bytesToHex(blake2b(enc.encode(s), { dkLen: 32 }));
}

// ── 纯 JS base64：node 与浏览器行为一致，不依赖 btoa/atob 的二进制字符串差异 ──
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64enc(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 3) {
    const a = u8[i];
    const b = i + 1 < u8.length ? u8[i + 1] : 0;
    const c = i + 2 < u8.length ? u8[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    s += B64[(n >>> 18) & 63] + B64[(n >>> 12) & 63]
      + (i + 1 < u8.length ? B64[(n >>> 6) & 63] : '=')
      + (i + 2 < u8.length ? B64[n & 63] : '=');
  }
  return s;
}
function b64dec(str) {
  const s = String(str).replace(/[^A-Za-z0-9+/=]/g, '');
  const v = ch => { const i = B64.indexOf(ch); return i < 0 ? 0 : i; };
  const out = [];
  for (let i = 0; i < s.length; i += 4) {
    const n = (v(s[i]) << 18) | (v(s[i + 1]) << 12) | (v(s[i + 2]) << 6) | v(s[i + 3]);
    out.push((n >>> 16) & 255);
    if (s[i + 2] !== '=') out.push((n >>> 8) & 255);
    if (s[i + 3] !== '=') out.push(n & 255);
  }
  return new Uint8Array(out);
}

// 记录数组里的 Uint8Array 用 {__b64} 中转，与 browser-store.mjs 的约定一致
const replacer = (_k, v) => (v instanceof Uint8Array ? { __b64: b64enc(v) } : v);
const reviver = (_k, v) =>
  (v && typeof v === 'object' && typeof v.__b64 === 'string' ? b64dec(v.__b64) : v);

function assertShape(file) {
  const h = file && file.head;
  if (!file || file.format !== 'vault-backup' || file.schema !== 1
    || !h || typeof h.vaultId !== 'string' || typeof h.deviceId !== 'string'
    || !h.kdf || typeof h.salt !== 'string'
    || !h.wrapped_dek || typeof h.wrapped_dek.nonce !== 'string' || typeof h.wrapped_dek.ct !== 'string'
    || typeof file.nonce !== 'string' || typeof file.payload !== 'string'
    || typeof file.digest !== 'string' || typeof file.created !== 'string'
    || typeof h.segment_id === 'undefined') {
    throw new Error('E_BACKUP_FORMAT');
  }
}

// 导出：先校验哈希链完整（不导出损坏库），再用 k_backup 封装整条链。
export async function exportBackup(store, session, opts = {}) {
  const meta = await store.loadMeta();
  if (!meta) throw new Error('E_NO_VAULT');
  if (!(session && session.dek instanceof Uint8Array)) throw new Error('E_NO_VAULT');
  const records = await store.loadShard(meta.deviceId);
  // ctx 字段名沿用 session.mjs（vaultId / deviceId），否则 record_hash 重算不一致会误判损坏
  const v = verifyChain(records, {
    vaultId: meta.vaultId, deviceId: meta.deviceId, segment_id: meta.segment_id,
  });
  if (!v.ok) throw new Error('E_INTEGRITY_FAIL');
  const w = meta.wrapped_dek;
  const wct = w.ct ?? w.ciphertext;
  const head = {
    vaultId: meta.vaultId,
    deviceId: meta.deviceId,
    kdf: meta.kdf,
    salt: b64enc(meta.salt),
    wrapped_dek: { nonce: b64enc(w.nonce), ct: b64enc(wct) },
    segment_id: meta.segment_id,
    count: records.length,
    head_hash: v.head_hash,
  };
  const bk = deriveBackupKey(session.dek);
  const { nonce, ct } = encryptRecord(
    enc.encode(JSON.stringify(records, replacer)), bk, { aad: backupAAD(head) },
  );
  const file = {
    format: 'vault-backup',
    schema: 1,
    created: opts.created || new Date().toISOString(),
    head,
    nonce: b64enc(nonce),
    payload: b64enc(ct),
  };
  file.digest = digestOf(file);
  return file;
}

// 导入：整库覆盖（M1 范围）。任一环节失败都必须抛错且不写 store。
export async function importBackup(store, file, { masterPassword, recoveryCode } = {}) {
  assertShape(file);
  if (digestOf(file) !== file.digest) throw new Error('E_BACKUP_CORRUPT');
  if (!masterPassword || !recoveryCode) {
    throw new TypeError('importBackup 需要 masterPassword 与 recoveryCode');
  }
  const h = file.head;
  const salt = b64dec(h.salt);
  const wrapped = {
    nonce: b64dec(h.wrapped_dek.nonce),
    ct: b64dec(h.wrapped_dek.ct),
  };
  const sk = base32ToSecretKey(String(recoveryCode).trim());
  if (sk.length !== 16) throw new Error('E_UNLOCK');
  const raw = deriveRawKey(masterPassword, salt);
  const kek = deriveKEK(raw, sk);
  const aad = buildAAD({
    vaultId: h.vaultId, deviceId: h.deviceId, schema: 1, kdf: h.kdf,
  });
  let dek;
  try {
    dek = unwrapDEK(wrapped, kek, aad);
  } catch {
    throw new Error('E_UNLOCK');
  }
  let records;
  try {
    const pt = decryptRecord(
      { nonce: b64dec(file.nonce), ct: b64dec(file.payload) },
      deriveBackupKey(dek), backupAAD(h),
    );
    records = JSON.parse(dec.decode(pt), reviver);
  } catch {
    throw new Error('E_BACKUP_CORRUPT');
  }
  if (!Array.isArray(records)) throw new Error('E_BACKUP_CORRUPT');
  const v = verifyChain(records, {
    vaultId: h.vaultId, deviceId: h.deviceId, segment_id: h.segment_id,
  });
  if (!v.ok) throw new Error('E_INTEGRITY_FAIL');
  if (h.head_hash && h.head_hash !== v.head_hash) throw new Error('E_BACKUP_CORRUPT');
  const meta = {
    vaultId: h.vaultId,
    deviceId: h.deviceId,
    salt,
    kdf: h.kdf,
    wrapped_dek: wrapped,
    segment_id: h.segment_id,
    count: records.length,
    head_hash: v.head_hash,
  };
  // 全部校验通过后才落盘
  await store.saveMeta(meta);
  await store.saveShard(h.deviceId, records);
  return { meta, count: records.length, dek, secretKey: sk };
}

// FR-K5：换 Secret Key 并重新封装同一个 DEK（记录不重加密）。
// 主密码必须先验证：否则会用错误 KEK 封装 DEK，导致金库连新恢复码都打不开。
export async function rotateRecoveryCode(store, session, { masterPassword } = {}) {
  const meta = await store.loadMeta();
  if (!meta) throw new Error('E_NO_VAULT');
  if (!(session && session.dek instanceof Uint8Array && session.secretKey instanceof Uint8Array)) {
    throw new Error('E_UNLOCK');
  }
  const aad = buildAAD({
    vaultId: meta.vaultId, deviceId: meta.deviceId, schema: 1, kdf: meta.kdf,
  });
  const raw = deriveRawKey(masterPassword, meta.salt);
  const oldKek = deriveKEK(raw, session.secretKey);
  let check;
  try {
    check = unwrapDEK(meta.wrapped_dek, oldKek, aad);
  } catch {
    throw new Error('E_UNLOCK');
  }
  if (!equalBytes(check, session.dek)) throw new Error('E_UNLOCK');
  const newSk = generateSecretKey();
  const newKek = deriveKEK(raw, newSk);
  meta.wrapped_dek = wrapDEK(session.dek, newKek, aad);
  await store.saveMeta(meta);
  return { recoveryCode: secretKeyToBase32(newSk), secretKey: newSk, meta };
}
