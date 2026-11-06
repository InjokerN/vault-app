// src/core/test-kdf.mjs — KDF 派生正确性 + 一致性测试（node 侧）
import { deriveKey, deriveFromPassword, KDF_PARAMS, randomSalt } from './kdf.mjs';

function bytesEq(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

const pw = 'correct horse battery stable';

const t0 = Date.now();
const { salt, key } = deriveFromPassword(pw);
const dt = Date.now() - t0;

console.log('派生耗时:', dt, 'ms');
console.log('密钥长度:', key.length, '(期望', KDF_PARAMS.dkLen, ')');

const k2 = deriveKey(pw, salt);
console.log('确定性（同密码+同 salt 一致）:', bytesEq(key, k2));

const k3 = deriveKey('wrong password', salt);
console.log('不同密码派生不同:', !bytesEq(key, k3));

const salt2 = randomSalt();
const k4 = deriveKey(pw, salt2);
console.log('不同 salt 派生不同:', !bytesEq(key, k4));

console.log('salt 长度:', salt.length, '(期望', KDF_PARAMS.saltLen, ')');
console.log('KDF 参数:', JSON.stringify(KDF_PARAMS));
