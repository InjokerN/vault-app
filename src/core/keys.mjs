// src/core/keys.mjs — 密钥体系（AGENT.md ② §2 密钥派生链，方案 B / ADR-002）
// 主密码 → Argon2id → raw_key；raw_key + Secret Key(恢复码) ─HKDF─► KEK；KEK 封装 DEK。
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { deriveKey } from './kdf.mjs';
import { encryptRecord, decryptRecord } from './aead.mjs';

// 主密码 → Argon2id → raw_key(32B)
export function deriveRawKey(masterPassword, salt) {
  return deriveKey(masterPassword, salt);
}

// KEK = HKDF-SHA256(ikm=raw_key, salt=secret_key, info="vault/kek/v1")
const KEK_INFO = new TextEncoder().encode('vault/kek/v1');
export function deriveKEK(rawKey, secretKey) {
  return hkdf(sha256, rawKey, secretKey, KEK_INFO, 32);
}

// 生成 Secret Key（恢复码）：128-bit 随机
export function generateSecretKey() {
  const sk = new Uint8Array(16);
  crypto.getRandomValues(sk);
  return sk;
}

// DEK：32-byte 随机
export function generateDEK() {
  const d = new Uint8Array(32);
  crypto.getRandomValues(d);
  return d;
}

// 封装 / 解封 DEK（wrapped_dek 存 meta.json；AAD 含规范化 KDF 参数以防降级）
export function wrapDEK(dek, kek, aad) {
  return encryptRecord(dek, kek, { aad });
}
export function unwrapDEK(wrapped, kek, aad) {
  return decryptRecord(wrapped, kek, aad);
}

// ── 恢复码 Base32 编解码（ADR-014：128bit → 26 字符 Crockford Base32） ──
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function secretKeyToBase32(sk) {
  let bits = 0, value = 0, out = '';
  for (const b of sk) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function base32ToSecretKey(str) {
  const clean = str.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}
