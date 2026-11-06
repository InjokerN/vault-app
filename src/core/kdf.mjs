// src/core/kdf.mjs — Argon2id 密钥派生（@noble/hashes）
// 参数待 M0.5 真机基准定死（ADR-016 不可降）；此处为可接受的默认起点，
// 任何设备不得为性能私自降低（AAD 校验会立即失败）。
import { argon2id } from '@noble/hashes/argon2.js';

export const KDF_PARAMS = Object.freeze({
  algorithm: 'argon2id',
  version: 0x13, // Argon2 0x13 (19)
  t: 3,         // 迭代次数（time cost）
  m: 65536,     // 内存成本（KiB）= 64 MiB
  p: 2,         // 并行度
  dkLen: 32,    // 派生密钥长度（字节）
  saltLen: 16,  // salt 长度（字节）
});

export function randomSalt(len = KDF_PARAMS.saltLen) {
  const s = new Uint8Array(len);
  crypto.getRandomValues(s);
  return s;
}

export function deriveKey(password, salt, params = KDF_PARAMS) {
  const pw = typeof password === 'string' ? new TextEncoder().encode(password) : password;
  const saltBytes = salt instanceof Uint8Array ? salt : new TextEncoder().encode(salt);
  return argon2id(pw, saltBytes, {
    t: params.t,
    m: params.m,
    p: params.p,
    dkLen: params.dkLen,
    version: params.version,
  });
}

// 一次性：生成随机 salt 并派生，返回 { salt, key }
export function deriveFromPassword(password, params = KDF_PARAMS) {
  const salt = randomSalt(params.saltLen);
  const key = deriveKey(password, salt, params);
  return { salt, key };
}
