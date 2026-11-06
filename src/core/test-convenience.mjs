// src/core/test-convenience.mjs — 便利副本解锁路径 + 设置页真实数据（FR-K2/K4、ADR-015、③ §5）
import { MemStore } from './store.mjs';
import { setupVault, unlockVault, addRecord, loadEntries, lock } from './session.mjs';
import { vaultFingerprint, kdfSummary, matchRecoveryCode } from './vault-info.mjs';

const store = new MemStore();
const MP = 'convenience-test-pass-2026';
const { recoveryCode, session, meta } = await setupVault(store, {
  masterPassword: MP, vaultId: 'v1', deviceId: 'd1',
});
await addRecord(store, session, { plaintext: { id: 'a', title: 'Alpha', type: 'login' } });

// 1) 便利副本路径：只给 secretKey，不给 recoveryCode（日常「只输主密码」）
const u = await unlockVault(store, { masterPassword: MP, secretKey: session.secretKey, deviceId: 'd1' });
console.log('便利副本解锁:', (await loadEntries(store, { dek: u.dek })).length, '条 (期望 1)');
console.log('返回值含 secretKey:', u.secretKey instanceof Uint8Array && u.secretKey.length === 16);

// 2) 两者皆缺 → 显式报错，不静默
try {
  await unlockVault(store, { masterPassword: MP, deviceId: 'd1' });
  console.log('缺恢复码/副本: ❌ 未报错');
} catch (e) {
  console.log('缺恢复码/副本:', e.name);
}

// 3) 错 Secret Key → E_UNLOCK（ADR-008 故意不区分）
try {
  await unlockVault(store, { masterPassword: MP, secretKey: new Uint8Array(16), deviceId: 'd1' });
  console.log('错 Secret Key: ❌ 未报错');
} catch (e) {
  console.log('错 Secret Key:', e.message);
}

// 4) 手输恢复码原路径仍可用（回归）
const u2 = await unlockVault(store, { masterPassword: MP, recoveryCode, deviceId: 'd1' });
console.log('手输恢复码解锁:', !!u2.dek);

// 5) FR-K4 归属校验
console.log('正确恢复码匹配:', !!matchRecoveryCode(recoveryCode, session.secretKey));
console.log('错恢复码不匹配:', matchRecoveryCode('0'.repeat(26), session.secretKey) === null);
console.log('空值不匹配:', matchRecoveryCode('', session.secretKey) === null);

// 6) ③ §5 设置页真实数据
const fp = vaultFingerprint(meta);
console.log('金库指纹:', fp, '| 格式正确:', /^([0-9a-f]{4} ){3}[0-9a-f]{4}$/.test(fp));
console.log('指纹确定性:', fp === vaultFingerprint(meta));
console.log('指纹随 wrapped_dek 变化:', fp !== vaultFingerprint({
  ...meta, wrapped_dek: { nonce: new Uint8Array(24), ct: new Uint8Array(48) },
}));
console.log('KDF 摘要读真实值:', kdfSummary(meta));

lock(session);
console.log('锁定后 session.secretKey 清空:', session.secretKey === null);
