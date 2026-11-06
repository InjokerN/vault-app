// src/core/test-keys.mjs — 密钥体系：恢复码编解码 + KEK 派生 + DEK 封装/解封 + 错误输入检测
import { deriveRawKey, deriveKEK, generateSecretKey, generateDEK, wrapDEK, unwrapDEK, secretKeyToBase32, base32ToSecretKey } from './keys.mjs';
import { randomSalt, KDF_PARAMS } from './kdf.mjs';
import { buildAAD } from './aead.mjs';

function bytesEq(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// 恢复码 Base32 往返
const sk = generateSecretKey();
const b32 = secretKeyToBase32(sk);
console.log('恢复码长度:', b32.length, '(期望 26)', '| 样例:', b32);
console.log('Base32 往返一致:', bytesEq(sk, base32ToSecretKey(b32)));

// 主密码 + 恢复码 → KEK
const salt = randomSalt();
const raw = deriveRawKey('master-pass-strong-2026', salt);
const kek = deriveKEK(raw, sk);

// DEK 封装 / 解封
const dek = generateDEK();
const aad = buildAAD({ vaultId: 'v1', deviceId: 'd1', schema: 1, kdf: KDF_PARAMS });
const wrapped = wrapDEK(dek, kek, aad);
const dek2 = unwrapDEK(wrapped, kek, aad);
console.log('DEK 往返一致:', bytesEq(dek, dek2));

// 错误恢复码（换机录入错码）→ KEK 不同 → 解封失败（FR-K4 归属校验）
const kekWrongSk = deriveKEK(raw, generateSecretKey());
try {
  unwrapDEK(wrapped, kekWrongSk, aad);
  console.log('错误恢复码检测: FAIL ❌');
} catch {
  console.log('错误恢复码检测: OK ✅ (应报「不属于此金库」)');
}

// 错误主密码 → KEK 不同 → 解封失败
const kekWrongPw = deriveKEK(deriveRawKey('wrong-master-pass', salt), sk);
try {
  unwrapDEK(wrapped, kekWrongPw, aad);
  console.log('错误主密码检测: FAIL ❌');
} catch {
  console.log('错误主密码检测: OK ✅');
}
