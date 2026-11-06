// src/core/vault-info.mjs — 设置页真实数据（③ §5）与恢复码归属校验（FR-K4）
// 纯函数，node 侧可测；不落盘任何密钥材料。
import { blake2b } from '@noble/hashes/blake2.js';
import { equalBytes } from '@noble/ciphers/utils.js';
import { base32ToSecretKey } from './keys.mjs';
import { bytesToHex } from './hashchain.mjs';

const enc = new TextEncoder();

// [未确认] ③ §5 只定义 `BLAKE2b(vault_id ‖ wrapped_dek)` 取前 8 字节，
// 未规定 ‖ 的字节编码。推荐项：UTF-8(vault_id) ‖ nonce ‖ ct（wrapped_dek 的序列化顺序）。
// 显示成 4 组 4 位 hex，与原型占位形态一致。
export function vaultFingerprint(meta) {
  const w = meta && meta.wrapped_dek;
  if (!w) return '—';
  const ct = w.ct ?? w.ciphertext;
  if (!(w.nonce instanceof Uint8Array) || !(ct instanceof Uint8Array)) return '—';
  const id = enc.encode(String(meta.vaultId || ''));
  const input = new Uint8Array(id.length + w.nonce.length + ct.length);
  input.set(id, 0);
  input.set(w.nonce, id.length);
  input.set(ct, id.length + w.nonce.length);
  return bytesToHex(blake2b(input).slice(0, 8)).match(/.{4}/g).join(' ');
}

// ③ §5：KDF 参数从 meta 读真实值，不写死 p（p=2 已于 2026-11-06 定为规格值，见 STATE §20）
export function kdfSummary(meta) {
  const k = meta && meta.kdf;
  if (!k) return '—';
  return `${Number(k.m || 0) / 1024} MiB / ${k.t} / ${k.p}`;
}

// FR-K4：重录恢复码时校验是否属于当前金库，不匹配返回 null（调用方报「该恢复码不属于此金库」）。
// 常量时间比较（③ §1.2 黑名单：比较密钥不得用非常量时间的实现）。
export function matchRecoveryCode(code, secretKey) {
  if (!(secretKey instanceof Uint8Array) || secretKey.length !== 16) return null;
  const sk = base32ToSecretKey(String(code || '').trim());
  if (sk.length !== secretKey.length) return null;
  return equalBytes(sk, secretKey) ? sk : null;
}
