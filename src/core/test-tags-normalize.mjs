// src/core/test-tags-normalize.mjs — 回归：含删除(tombstone)条目时 loadEntries 必须归一化 tags，
// 否则 tagCount/filtered 对 e.tags 调 .includes 会抛 “Cannot read properties of undefined”。
import { MemStore } from './store.mjs';
import { setupVault, unlockVault, addRecord, loadEntries, deleteRecord } from './session.mjs';

const MP = 'tags-norm-pass-2026';
const store = new MemStore();
const { recoveryCode, session } = await setupVault(store, {
  masterPassword: MP, vaultId: 'v1', deviceId: 'd1',
});

for (const it of [
  { id: 'a', title: 'Alpha', type: 'login', tags: ['核心'] },
  { id: 'b', title: 'Beta', type: 'card', tags: ['支付'] },
  { id: 'c', title: 'Gamma', type: 'note', tags: [] },
]) await addRecord(store, session, { plaintext: it });

// 删除一条 → 产生 tombstone 记录 {id, deleted:true}（无 tags 字段）
await deleteRecord(store, session, { id: 'b' });

const entries = await loadEntries(store, session);

// 1) 每条目都必须有 tags 数组（含 tombstone）
const allHaveTags = entries.every(e => Array.isArray(e.tags));
console.log('每条目都有 tags 数组:', allHaveTags);

// 2) tombstone 本身也归一化：tags=[]、deleted=true
const tomb = entries.find(e => e.id === 'b');
console.log('tombstone 归一化 tags=[]:', tomb && Array.isArray(tomb.tags) && tomb.tags.length === 0);
console.log('tombstone deleted=true:', tomb && tomb.deleted === true);

// 3) 模拟 tagCount / filtered 在全部 ENTRIES（含 tombstone）上遍历不抛错
let crashed = null;
try {
  const tagCount = name => entries.filter(e => (e.tags || []).includes(name)).length;
  const c1 = tagCount('核心');
  const c2 = tagCount('支付');
  const live = entries.filter(e => !e.deleted);
  const filteredByTag = entries.filter(e => {
    if (e.deleted) return false;
    if (!((e.tags || []).includes('核心'))) return false;
    return true;
  });
  console.log('tagCount(核心):', c1, '(期望 1)');
  console.log('tagCount(支付):', c2, '(期望 0，tombstone 不计)');
  console.log('存活条目数:', live.length, '(期望 2)');
  console.log('按标签过滤不抛错:', true);
} catch (e) { crashed = e; }
console.log('遍历未崩溃:', crashed === null);

// 4) 解锁后再次加载同样安全（真实解锁路径）
const u = await unlockVault(store, { masterPassword: MP, recoveryCode, deviceId: 'd1' });
const again = await loadEntries(store, { dek: u.dek });
console.log('解锁后加载每条目仍有 tags 数组:', again.every(e => Array.isArray(e.tags)));

const ok = allHaveTags && tomb && tomb.tags.length === 0 && tomb.deleted === true
  && crashed === null && again.every(e => Array.isArray(e.tags));
console.log(ok ? '\n✅ tags 归一化回归全部通过' : '\n❌ 存在失败项');
process.exit(ok ? 0 : 1);
