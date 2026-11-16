// src/core/test-destroy.mjs — FR-SET4 销毁本地金库
// 覆盖：① 2.9 / ② §3「销毁本地金库」五步边界、规则 5/6（失败要吵、不假装全清）。
import { setupVault, addRecord, loadEntries } from './session.mjs';
import { destroyLocalVault, verifyMasterPassword } from './destroy.mjs';

const MP = 'destroy-test-pass-2026';
const WRONG = 'wrong-master-password';
let pass = 0, fail = 0;
const check = (label, cond) => {
  console.log((cond ? '✓ ' : '❌ ') + label);
  cond ? pass++ : fail++;
};
async function expectCode(label, fn, want) {
  try { await fn(); check(label + '（应报错）', false); }
  catch (e) { check(label + ' → ' + e.message, e.message === want); }
}

// 内存版的 localStorage（模拟 vault.* 键）与 IndexedDB 便利副本
function makeEnv() {
  const ls = new Map();
  const idb = new Map();
  let localCalls = 0, idbCalls = 0;
  return {
    ls, idb,
    get localCalls() { return localCalls; },
    get idbCalls() { return idbCalls; },
    clearLocalKeys: async () => {
      localCalls++;
      for (const k of [...ls.keys()]) if (k.startsWith('vault.')) ls.delete(k);
    },
    clearConvenience: async (vaultId) => {
      idbCalls++;
      for (const k of [...idb.keys()]) if (k === vaultId) idb.delete(k);
    },
  };
}

// 贴近真实的 store：meta / shard 存在 localStorage，清 vault.* 键即清数据（与 BrowserStore 同）。
// 直接存对象引用以保留 Uint8Array 类型（生产版用 base64 中转，测试无需）。
class LocalBackedStore {
  constructor(ls) { this.ls = ls; }
  async saveMeta(meta) { this.ls.set('vault.meta', meta); }
  async loadMeta() { return this.ls.get('vault.meta') || null; }
  async saveShard(d, r) { this.ls.set('vault.shard.' + d, r); }
  async loadShard(d) { return this.ls.get('vault.shard.' + d) || []; }
}

// ── 建库：meta + 2 条 + 若干 vault.* 偏好 + 便利副本 ──
async function build() {
  const env = makeEnv();
  const store = new LocalBackedStore(env.ls);
  const { recoveryCode, session } = await setupVault(store, {
    masterPassword: MP, vaultId: 'v1', deviceId: 'd1',
  });
  for (const it of [
    { id: 'a', title: 'Alpha', type: 'login' },
    { id: 'b', title: 'Beta', type: 'card' },
  ]) await addRecord(store, session, { plaintext: it });
  env.ls.set('vault.deviceId', 'd1');
  env.ls.set('vault.sort', 'time');
  env.ls.set('vault.order', '[]');
  env.ls.set('vault.registry.v1', '{}');
  env.ls.set('other-app.key', 'keep'); // 非本应用键，须保留
  env.idb.set('v1', new Uint8Array(16));
  env.idb.set('v2', new Uint8Array(16)); // 另一金库便利副本（旁支，本次不清）
  return { store, session, env, recoveryCode };
}

// ── 0) 前置：锁定时拒绝，零改动 ──
{
  const { store, session, env } = await build();
  session.dek = null; session.secretKey = null;
  await expectCode('锁定态销毁', () => destroyLocalVault(store, session, MP, env), 'E_LOCKED');
  check('锁定态未触发任何清除回调', env.localCalls === 0 && env.idbCalls === 0);
  check('锁定态 meta 仍在', (await store.loadMeta()) !== null);
}

// ── 1) 错主密码：E_UNLOCK，零改动 ──
{
  const { store, session, env } = await build();
  await expectCode('错主密码销毁', () => destroyLocalVault(store, session, WRONG, env), 'E_UNLOCK');
  check('错密未触发清除回调', env.localCalls === 0 && env.idbCalls === 0);
  check('错密后会话仍可用', session.dek instanceof Uint8Array);
  check('错密后条目仍可读', (await loadEntries(store, session)).length === 2);
  check('错密后 vault.* 键仍在', env.ls.has('vault.meta') && env.ls.has('vault.shard.d1'));
}

// ── 2) verifyMasterPassword 单独校验：对/错 ──
{
  const { store, session } = await build();
  check('正确主密码校验通过', (await verifyMasterPassword(store, session, MP)).vaultId === 'v1');
  await expectCode('错误主密码校验', () => verifyMasterPassword(store, session, WRONG), 'E_UNLOCK');
}

// ── 3) 正确销毁：分项全清 + 内存清空 + 非本应用键保留 ──
{
  const { store, session, env } = await build();
  const r = await destroyLocalVault(store, session, MP, env);
  check('销毁结果 ok', r.ok === true && r.errors.length === 0);
  check('清了 localStorage', r.cleared.localKeys === true && env.localCalls === 1);
  check('清了 IndexedDB 便利副本', r.cleared.convenience === true && env.idbCalls === 1);
  check('本应用 vault.* 键全消失', ![...env.ls.keys()].some(k => k.startsWith('vault.')));
  check('非本应用键保留', env.ls.get('other-app.key') === 'keep');
  check('仅清当前金库便利副本', !env.idb.has('v1') && env.idb.has('v2'));
  check('内存 DEK / Secret Key 已清', session.dek === null && session.secretKey === null);
  check('销毁后 meta 读空（回首次设置态）', (await store.loadMeta()) === null);
}

// ── 4) 分项失败要吵：便利副本失败仍继续清 localStorage，结果 ok=false ──
{
  const { store, session, env } = await build();
  env.clearConvenience = async () => { throw new Error('E_IDB_TX_ABORTED'); };
  const r = await destroyLocalVault(store, session, MP, env);
  check('部分失败时 ok=false', r.ok === false && r.errors.length === 1);
  check('失败项被记录', r.errors[0].item === 'IndexedDB' && r.errors[0].code === 'E_IDB_TX_ABORTED');
  check('localStorage 仍被清除（不因 IDB 失败而停）', r.cleared.localKeys === true);
  check('内存仍被清空', session.dek === null);
}

// ── 5) 缺回调也要吵 ──
{
  const { store, session } = await build();
  const r = await destroyLocalVault(store, session, MP, {});
  check('无回调时两项都报错', r.ok === false && r.errors.length === 2);
  check('无回调仍清内存', session.dek === null);
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail > 0) process.exitCode = 1;
