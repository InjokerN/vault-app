// src/core/test-session.mjs — M1 端到端：设置 → 增/改/删 → 锁定 → 解锁 → 篡改/错密检测
import { MemStore } from './store.mjs';
import {
  setupVault, unlockVault, addRecord, lock,
  loadEntries, updateRecord, deleteRecord,
} from './session.mjs';

const store = new MemStore();
const MP = 'strong-master-pass-2026';

const { recoveryCode, session } = await setupVault(store, {
  masterPassword: MP, vaultId: 'v1', deviceId: 'd1',
});
console.log('恢复码:', recoveryCode, '| 长度', recoveryCode.length);

const entries0 = await loadEntries(store, session);
console.log('初始 entries:', entries0.length, '(期望 0)');

await addRecord(store, session, { plaintext: { id: 'a', title: 'GitHub', type: 'login' } });
await addRecord(store, session, { plaintext: { id: 'b', title: 'Google', type: 'login' } });
let es = await loadEntries(store, session);
console.log('增 2 条后:', es.length, es.map(e => e.title));

await updateRecord(store, session, { id: 'a', plaintext: { id: 'a', title: 'GitHub-改', type: 'login' } });
es = await loadEntries(store, session);
console.log('改后 a 标题:', es.find(e => e.id === 'a').title, '(期望 GitHub-改)');

await deleteRecord(store, session, { id: 'b' });
es = await loadEntries(store, session);
const b = es.find(e => e.id === 'b');
console.log('删后 b 存在且 deleted:', !!b, b && b.deleted, '(期望 true)');
console.log('有效(非deleted)条数:', es.filter(e => !e.deleted).length, '(期望 1)');

// 重新解锁，验证 dek 可用
lock(session);
const u = await unlockVault(store, { masterPassword: MP, recoveryCode, deviceId: 'd1' });
const es2 = await loadEntries(store, { dek: u.dek });
console.log('解锁后 loadEntries 条数:', es2.length, '| head_hash 非空:', !!u.head_hash);

// 篡改一条密文 → 解锁完整性失败
const recs = await store.loadShard('d1');
recs[0].ciphertext = recs[0].ciphertext.slice(0, -1);
await store.saveShard('d1', recs);
try {
  await unlockVault(store, { masterPassword: MP, recoveryCode, deviceId: 'd1' });
  console.log('篡改检测: FAIL ❌');
} catch (e) { console.log('篡改检测: OK ✅', e.message); }

// 错误主密码
try {
  await unlockVault(store, { masterPassword: 'wrong', recoveryCode, deviceId: 'd1' });
  console.log('错误密码检测: FAIL ❌');
} catch (e) { console.log('错误密码检测: OK ✅', e.message); }

// 错误恢复码
try {
  await unlockVault(store, { masterPassword: MP, recoveryCode: '00000000000000000000000000', deviceId: 'd1' });
  console.log('错误恢复码检测: FAIL ❌');
} catch (e) { console.log('错误恢复码检测: OK ✅', e.message); }
