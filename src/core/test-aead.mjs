// src/core/test-aead.mjs — XChaCha20-Poly1305 往返 + 篡改/降级/错密钥检测
import { encryptRecord, decryptRecord, randomNonce, buildAAD } from './aead.mjs';
import { deriveFromPassword, KDF_PARAMS } from './kdf.mjs';

function bytesEq(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
const enc = new TextEncoder();
const dec = new TextDecoder();

const { key } = deriveFromPassword('master-pass-2026');
const aad = buildAAD({ vaultId: 'v1', deviceId: 'd1', schema: 1, kdf: KDF_PARAMS });
const msg = enc.encode(
  JSON.stringify({ title: 'GitHub', user: 'yg', fields: [{ k: '密码', v: 'xk2!vN9s' }] })
);

const rec = encryptRecord(msg, key, { aad });
console.log('nonce 长度:', rec.nonce.length, '(期望 24)');
const pt = decryptRecord(rec, key, aad);
console.log('往返一致:', bytesEq(msg, pt), '->', dec.decode(pt).slice(0, 24));

// 篡改密文
const tampered = { nonce: rec.nonce, ct: rec.ct.slice() };
tampered.ct[0] ^= 1;
try {
  decryptRecord(tampered, key, aad);
  console.log('篡改检测: 失败(未报错) ❌');
} catch {
  console.log('篡改检测: OK ✅');
}

// KDF 参数被降级（m 变小）→ AAD 不符 → 必须失败（防降级）
const aadLowered = buildAAD({
  vaultId: 'v1',
  deviceId: 'd1',
  schema: 1,
  kdf: { ...KDF_PARAMS, m: 32768 },
});
try {
  decryptRecord(rec, key, aadLowered);
  console.log('降级 AAD 检测: 失败(未报错) ❌');
} catch {
  console.log('降级 AAD 检测: OK ✅ (防降级生效)');
}

// 错误密钥
const { key: key2 } = deriveFromPassword('other-pass');
try {
  decryptRecord(rec, key2, aad);
  console.log('错误密钥检测: 失败 ❌');
} catch {
  console.log('错误密钥检测: OK ✅');
}

// 随机 nonce 不复用
const n1 = randomNonce();
const n2 = randomNonce();
console.log('随机 nonce 不复用:', !bytesEq(n1, n2));
