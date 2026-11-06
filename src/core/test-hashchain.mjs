// src/core/test-hashchain.mjs — 哈希链连续性 + 篡改/删除/回滚检测
import { recordHash, verifyChain, checkWaterLevel, GENESIS } from './hashchain.mjs';
import { encryptRecord } from './aead.mjs';
import { deriveFromPassword } from './kdf.mjs';

const enc = new TextEncoder();
const { key } = deriveFromPassword('chain-test');
const ctx = { vault_id: 'v1', device_id: 'd1', segment_id: 0 };

function makeRecord(plain, seq, prev) {
  const { nonce, ct } = encryptRecord(enc.encode(plain), key, { aad: new Uint8Array(0) });
  const record_hash = recordHash({ ...ctx, sequence: seq, prev_hash: prev, nonce, ciphertext: ct });
  return { sequence: seq, prev_hash: prev, nonce, ciphertext: ct, record_hash };
}

let prev = GENESIS;
const recs = [];
for (let i = 0; i < 3; i++) {
  const r = makeRecord('record-' + i, i, prev);
  recs.push(r);
  prev = r.record_hash;
}
const v = verifyChain(recs, ctx);
console.log('链校验 ok:', v.ok, '| head_hash:', v.head_hash ? v.head_hash.slice(0, 16) + '…' : null, '| max_seq:', v.max_sequence);

// 篡改中间一条密文
const tampered = recs.map((r) => ({ ...r }));
tampered[1] = { ...tampered[1], ciphertext: tampered[1].ciphertext.slice(0, -1) };
console.log('篡改检测:', verifyChain(tampered, ctx).ok === false ? 'OK ✅' : 'FAIL ❌');

// 删除中间一条（prev_hash 链断裂）
const dropped = recs.filter((_, i) => i !== 1);
console.log('删除检测:', verifyChain(dropped, ctx).ok === false ? 'OK ✅' : 'FAIL ❌');

// 调换顺序（sequence 不连续）
const swapped = [recs[1], recs[0], recs[2]];
console.log('换序检测:', verifyChain(swapped, ctx).ok === false ? 'OK ✅' : 'FAIL ❌');

// 水位比对
console.log('远端更低 →', checkWaterLevel({ max_sequence: 0, head_hash: 'x' }, { max_sequence: 2, head_hash: v.head_hash }));
console.log('同 seq 不同 hash →', checkWaterLevel({ max_sequence: 2, head_hash: 'different' }, { max_sequence: 2, head_hash: v.head_hash }));
console.log('远端更高 →', checkWaterLevel({ max_sequence: 5, head_hash: 'y' }, { max_sequence: 2, head_hash: v.head_hash }));
