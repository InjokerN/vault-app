// src/core/hashchain.mjs — 分片哈希链与回滚水位（AGENT.md ② §4.6）
// 解决 AEAD 发现不了的「记录被删 / 文件被截断 / 整链回滚」。
import { blake2b } from '@noble/hashes/blake2.js';

export const GENESIS = 'GENESIS';
const DOMAIN = 'vault/rec/v1';

function u64be(n) {
  const b = new Uint8Array(8);
  const hi = Math.floor(n / 0x100000000);
  const lo = n >>> 0;
  b[0] = (hi >>> 24) & 0xff; b[1] = (hi >>> 16) & 0xff;
  b[2] = (hi >>> 8) & 0xff; b[3] = hi & 0xff;
  b[4] = (lo >>> 24) & 0xff; b[5] = (lo >>> 16) & 0xff;
  b[6] = (lo >>> 8) & 0xff; b[7] = lo & 0xff;
  return b;
}

export function bytesToHex(b) {
  let s = '';
  for (const x of b) s += x.toString(16).padStart(2, '0');
  return s;
}

// record_hash = BLAKE2b("vault/rec/v1" ‖ vault_id ‖ device_id ‖ segment_id
//                       ‖ u64be(sequence) ‖ prev_hash ‖ nonce ‖ ciphertext)
// 哈希输入是规范化后的完整密文记录，不是明文。
export function recordHash(fields) {
  const enc = new TextEncoder();
  const parts = [
    enc.encode(DOMAIN),
    enc.encode(fields.vault_id || ''),
    enc.encode(fields.device_id || ''),
    enc.encode(String(fields.segment_id ?? 0)),
    u64be(fields.sequence ?? 0),
    enc.encode(fields.prev_hash || GENESIS),
    fields.nonce,
    fields.ciphertext,
  ];
  const total = parts.reduce((s, p) => s + p.length, 0);
  const buf = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { buf.set(p, off); off += p.length; }
  return bytesToHex(blake2b(buf));
}

// 校验一条链连续：sequence 单调 + prev_hash 链 + record_hash 重算一致
export function verifyChain(records, ctx) {
  let prev = GENESIS;
  let seq = 0;
  for (const r of records) {
    if (r.sequence !== seq) return { ok: false, reason: 'sequence 不连续', at: r.sequence };
    if (r.prev_hash !== prev) return { ok: false, reason: 'prev_hash 断裂', at: r.sequence };
    const h = recordHash({ ...ctx, sequence: r.sequence, prev_hash: r.prev_hash, nonce: r.nonce, ciphertext: r.ciphertext });
    if (h !== r.record_hash) return { ok: false, reason: 'record_hash 不匹配', at: r.sequence };
    prev = r.record_hash;
    seq++;
  }
  return { ok: true, head_hash: prev, max_sequence: seq - 1 };
}

// 本地单调水位比对（防回滚）。MAC 抗伪造不抗重放，新鲜性靠本地水位。
// 返回 'OK' | 'E_ROLLBACK_SUSPECTED' | 'E_INTEGRITY_FAIL'
export function checkWaterLevel(remote, localWater) {
  if (remote.max_sequence < localWater.max_sequence) return 'E_ROLLBACK_SUSPECTED';
  if (remote.max_sequence === localWater.max_sequence && remote.head_hash !== localWater.head_hash) {
    return 'E_INTEGRITY_FAIL';
  }
  return 'OK';
}
