// src/core/aead.mjs — XChaCha20-Poly1305 记录封装（@noble/ciphers/chacha.js）
// 符合 AGENT.md ②：XChaCha20-Poly1305，192-bit(24B) 随机 nonce，AAD 绑定 KDF 参数防降级。
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';

export const NONCE_LEN = 24; // XChaCha20 192-bit nonce

export function randomNonce(len = NONCE_LEN) {
  const n = new Uint8Array(len);
  crypto.getRandomValues(n);
  return n;
}

// AAD：规范化 KDF 参数 + vault/device/schema，用于防降级与上下文绑定（AGENT.md ② §AAD）
export function buildAAD({ vaultId = '', deviceId = '', schema = 1, kdf } = {}) {
  const kdfStr = kdf
    ? `${kdf.algorithm}:v${kdf.version}:t${kdf.t}:m${kdf.m}:p${kdf.p}`
    : '';
  return new TextEncoder().encode(
    `vault:${vaultId}|device:${deviceId}|schema:${schema}|kdf:${kdfStr}`
  );
}

// 加密：plaintext(Uint8Array) + key(32B) + aad -> { nonce, ct }（均为 Uint8Array）
export function encryptRecord(plaintext, key, opts = {}) {
  const nonce = opts.nonce || randomNonce();
  const aad = opts.aad || new Uint8Array(0);
  if (key.length !== 32) throw new Error('AEAD key 必须为 32 字节');
  if (nonce.length !== NONCE_LEN) throw new Error(`nonce 必须为 ${NONCE_LEN} 字节`);
  const ct = xchacha20poly1305(key, nonce, aad).encrypt(plaintext);
  return { nonce, ct };
}

// 解密：需与加密时相同的 aad；AAD 不符或密文被篡改都会抛错
// 兼容密文字段名 ct / ciphertext（encryptRecord 返回 ct；存储记录用 ciphertext）
export function decryptRecord(rec, key, aad) {
  const nonce = rec.nonce;
  const ct = rec.ct ?? rec.ciphertext;
  if (key.length !== 32) throw new Error('AEAD key 必须为 32 字节');
  if (nonce.length !== NONCE_LEN) throw new Error(`nonce 必须为 ${NONCE_LEN} 字节`);
  if (!(ct instanceof Uint8Array)) throw new Error('密文缺失或非 Uint8Array');
  return xchacha20poly1305(key, nonce, aad).decrypt(ct);
}
