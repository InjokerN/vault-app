// src/core/test-backup.mjs — ADR-020/021、FR-SET2/SET3、FR-K5、§5 验收第 8 条
import { MemStore } from './store.mjs';
import { setupVault, unlockVault, addRecord, loadEntries } from './session.mjs';
import { exportBackup, importBackup, rotateRecoveryCode } from './backup.mjs';

const MP = 'backup-test-pass-2026';
const norm = arr => JSON.stringify([...arr].sort((a, b) => String(a.id).localeCompare(String(b.id))));
const creds = { masterPassword: MP, recoveryCode: null };

const store = new MemStore();
const { recoveryCode, session } = await setupVault(store, {
  masterPassword: MP, vaultId: 'v1', deviceId: 'd1',
});
creds.recoveryCode = recoveryCode;
for (const it of [
  { id: 'a', title: 'Alpha', type: 'login' },
  { id: 'b', title: 'Beta', type: 'card' },
  { id: 'c', title: 'Gamma', type: 'note' },
]) await addRecord(store, session, { plaintext: it });
const before = await loadEntries(store, session);

// ── 1) 导出 ──
const file = await exportBackup(store, session);
const serialized = JSON.stringify(file);
console.log('导出格式正确:', file.format === 'vault-backup' && file.schema === 1 && /^[0-9a-f]{64}$/.test(file.digest));
console.log('head 自包含 wrapped_dek:', typeof file.head.wrapped_dek.ct === 'string');
console.log('备份不含恢复码（Q11）:', !serialized.includes(recoveryCode));
console.log('备份可 JSON 往返:', JSON.parse(serialized).digest === file.digest);

// ── 2) §5 验收第 8 条：导出 → 删光本地 → 恢复 → 条目完全一致 ──
const empty = new MemStore(); // 模拟「删除全部本地数据」
const r = await importBackup(empty, file, creds);
const after = await loadEntries(empty, { dek: r.dek });
console.log('恢复条数:', r.count, '(期望 3)');
console.log('条目完全一致:', norm(before) === norm(after));
const u = await unlockVault(empty, { ...creds, deviceId: 'd1' });
console.log('恢复后可用恢复码正常解锁:', (await loadEntries(empty, { dek: u.dek })).length === 3);

// ── 3) 损坏 / 篡改必须吵，且不写盘 ──
async function expectErr(label, f, want) {
  try { await f(); console.log(label + ': ❌ 未报错'); }
  catch (e) { console.log(label + ':', e.message, e.message === want ? '✓' : '(期望 ' + want + ')'); }
}
const failedStore = new MemStore();
await expectErr('摘要不符', () => importBackup(failedStore, { ...file, digest: '0'.repeat(64) }, creds), 'E_BACKUP_CORRUPT');
await expectErr('head 被篡改', () => importBackup(new MemStore(), { ...file, head: { ...file.head, count: 999 } }, creds), 'E_BACKUP_CORRUPT');
await expectErr('格式不符', () => importBackup(new MemStore(), { ...file, format: 'other' }, creds), 'E_BACKUP_FORMAT');
await expectErr('错恢复码', () => importBackup(new MemStore(), file, { masterPassword: MP, recoveryCode: '0'.repeat(26) }), 'E_UNLOCK');
await expectErr('错主密码', () => importBackup(new MemStore(), file, { masterPassword: 'wrong-pass-2026', recoveryCode }), 'E_UNLOCK');
console.log('失败后未写盘:', (await failedStore.loadMeta()) === null);

// 损坏的本地库不得导出
const badStore = new MemStore();
await badStore.saveMeta(await store.loadMeta());
const recs = await store.loadShard('d1');
await badStore.saveShard('d1', recs.filter((_, i) => i !== 1));
await expectErr('哈希链损坏拒绝导出', () => exportBackup(badStore, session), 'E_INTEGRITY_FAIL');

// ── 4) FR-K5 重新生成恢复码 ──
const rot = await rotateRecoveryCode(store, session, { masterPassword: MP });
console.log('新恢复码不同于旧码:', rot.recoveryCode !== recoveryCode, '| 长度', rot.recoveryCode.length);
await expectErr('旧码失效', () => unlockVault(store, { ...creds, deviceId: 'd1' }), 'E_UNLOCK');
const u2 = await unlockVault(store, { masterPassword: MP, recoveryCode: rot.recoveryCode, deviceId: 'd1' });
const afterRot = await loadEntries(store, { dek: u2.dek });
console.log('新码解锁成功:', afterRot.length === 3, '| 记录未重加密、条目不变:', norm(before) === norm(afterRot));
const snap = m => JSON.stringify(m, (_k, v) => (v instanceof Uint8Array ? [...v] : v));
const metaBefore = snap(await store.loadMeta());
await expectErr('错主密码拒绝轮换', () => rotateRecoveryCode(store, { ...session, secretKey: rot.secretKey }, { masterPassword: 'wrong-pass-2026' }), 'E_UNLOCK');
console.log('拒绝后 wrapped_dek 未被改写:', metaBefore === snap(await store.loadMeta()));
