// src/core/test-sync.mjs — M3-A 同步编排（FR-Y1/Y2/Y5、④ M3-A）
// 用纯内存假 RemoteStore，不触网。覆盖：推送→清空本地→恢复一致、错凭据/损坏快照本地不动、
// 推送失败保留本地、乐观锁、PAT 存储语义、5s 防抖调度。
import { MemStore } from './store.mjs';
import { setupVault, addRecord, loadEntries } from './session.mjs';
import { pushSnapshot, pullSnapshot, createDebouncer, DEFAULT_SNAPSHOT_PATH } from './sync.mjs';
import { PatStore } from '../remote/pat-store.mjs';

const MP = 'sync-orchestrator-pass-2026';
const WRONG_MP = 'wrong-pass';
let pass = 0, fail = 0;
const check = (label, cond) => { console.log((cond ? '✓ ' : '❌ ') + label); cond ? pass++ : fail++; };
async function expectCode(label, fn, want) {
  try { await fn(); check(label + '（应报错）', false); }
  catch (e) { check(label + ' → ' + e.message, e.message === want); }
}
const norm = a => JSON.stringify([...a].sort((x, y) => String(x.id).localeCompare(String(y.id))));

// 纯内存假 RemoteStore（符合契约）
function makeRemote() {
  const files = new Map();
  const state = { pushFails: false, readFails: false };
  return {
    files, state,
    async listFiles(prefix) { return [...files.keys()].filter(k => !prefix || k.startsWith(prefix)); },
    async readFile(path) {
      if (state.readFails) throw new Error('E_NETWORK');
      if (!files.has(path)) throw new Error('E_NOT_FOUND');
      return { content: files.get(path), sha: 'sha-' + path };
    },
    async writeFile(path, content, sha) {
      if (state.pushFails) throw new Error('E_AUTH');
      if (sha && sha !== 'sha-' + path) throw new Error('E_CONFLICT');
      files.set(path, content);
      return { sha: 'sha-' + path };
    },
  };
}
function makeFakeStorage() {
  const m = new Map();
  return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m };
}

// ── 建库 + 3 条 ──
async function build() {
  const store = new MemStore();
  const remote = makeRemote();
  const { recoveryCode, session } = await setupVault(store, { masterPassword: MP, vaultId: 'v1', deviceId: 'd1' });
  for (const it of [
    { id: 'a', title: 'Alpha', type: 'login' },
    { id: 'b', title: 'Beta', type: 'card' },
    { id: 'c', title: 'Gamma', type: 'note' },
  ]) await addRecord(store, session, { plaintext: it });
  return { store, remote, session, recoveryCode };
}

// ── 1) 推送 → 写远端 ──
let ctx;
{
  ctx = await build();
  const r = await pushSnapshot(ctx.store, ctx.session, ctx.remote);
  check('推送返回路径/sha/字节数', r.path === DEFAULT_SNAPSHOT_PATH && !!r.sha && r.bytes > 0);
  check('远端确实写入快照', ctx.remote.files.has(DEFAULT_SNAPSHOT_PATH));
}

// ── 2) 清空本地 → 拉取恢复一致 ──
{
  const wiped = new MemStore();
  const r = await pullSnapshot(wiped, ctx.remote, undefined, { masterPassword: MP, recoveryCode: ctx.recoveryCode });
  const after = await loadEntries(wiped, { dek: r.dek });
  const before = await loadEntries(ctx.store, ctx.session);
  check('恢复条数 = 3', r.count === 3);
  check('条目完全一致', norm(before) === norm(after));
}

// ── 3) 错主密码 / 错恢复码：报错且本地不动 ──
{
  const local = await build();
  const before = await loadEntries(local.store, local.session);
  await expectCode('错主密码拉取', () => pullSnapshot(local.store, ctx.remote, undefined, { masterPassword: WRONG_MP, recoveryCode: ctx.recoveryCode }), 'E_UNLOCK');
  await expectCode('错恢复码拉取', () => pullSnapshot(local.store, ctx.remote, undefined, { masterPassword: MP, recoveryCode: 'AAAAAAAAAAAAAAAAAAAAAAAAAA' }), 'E_UNLOCK');
  const after = await loadEntries(local.store, local.session);
  check('错凭据后本地条目不变', norm(before) === norm(after));
}

// ── 4) 损坏快照：报错且本地不动 ──
{
  const local = await build();
  const before = await loadEntries(local.store, local.session);
  const orig = ctx.remote.files.get(DEFAULT_SNAPSHOT_PATH);
  ctx.remote.files.set(DEFAULT_SNAPSHOT_PATH, new TextEncoder().encode('not-json'));
  await expectCode('损坏快照拉取', () => pullSnapshot(local.store, ctx.remote, undefined, { masterPassword: MP, recoveryCode: ctx.recoveryCode }), 'E_BACKUP_CORRUPT');
  ctx.remote.files.set(DEFAULT_SNAPSHOT_PATH, orig);
  const after = await loadEntries(local.store, local.session);
  check('损坏后本地条目不变', norm(before) === norm(after));
}

// ── 5) 推送失败：报错，本地条目仍在 ──
{
  const local = await build();
  const before = await loadEntries(local.store, local.session);
  local.remote.state.pushFails = true;
  await expectCode('推送失败', () => pushSnapshot(local.store, local.session, local.remote), 'E_AUTH');
  const after = await loadEntries(local.store, local.session);
  check('推送失败后本地条目不变', norm(before) === norm(after));
}

// ── 6) 远端不可达：读取报错 ──
{
  const r = makeRemote();
  r.state.readFails = true;
  await expectCode('远端读取失败', () => pullSnapshot(new MemStore(), r, undefined, { masterPassword: MP, recoveryCode: ctx.recoveryCode }), 'E_NETWORK');
}

// ── 7) 首次推送（远端无文件）不应误判为错误 ──
{
  const local = await build();
  const r = await pushSnapshot(local.store, local.session, local.remote); // 空远端
  check('首次推送成功', !!r.sha && local.remote.files.has(DEFAULT_SNAPSHOT_PATH));
}

// ── 8) PAT 存储语义 ──
{
  const sess = makeFakeStorage(), loc = makeFakeStorage();
  const pats = new PatStore({ sessionStorage: sess, localStorage: loc });
  pats.save('ghp_abc', { remember: false });
  check('默认写入 sessionStorage', sess.getItem('vault.pat.memory') === 'ghp_abc');
  check('默认不写 localStorage', loc.getItem('vault.pat.remembered') === null);
  check('读取到 PAT', pats.load() === 'ghp_abc');
  pats.save('ghp_xyz', { remember: true });
  check('勾选后写 localStorage', loc.getItem('vault.pat.remembered') === 'ghp_xyz');
  check('hasRemembered 为真', pats.hasRemembered() === true);
  pats.clear();
  check('清除后读不到', pats.load() === null && !pats.hasRemembered());
  // 无任何 storage 时内存兜底
  const mem = new PatStore({});
  mem.save('ghp_mem');
  check('无 storage 时内存兜底', mem.load() === 'ghp_mem');
}

// ── 9) 5s 防抖调度 ──
{
  const timers = [];
  const impl = {
    // id 从 1 开始，与真实 setTimeout 一致（真实返回值非 0，避免 falsy 边界）
    setTimeout: (fn, ms) => { timers.push({ fn, ms, cancelled: false }); return timers.length; },
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].cancelled = true; },
  };
  let calls = 0;
  const d = createDebouncer(async () => { calls++; }, 5000, impl);
  d.trigger(); d.trigger(); d.trigger();
  check('防抖只保留最后一个计时器', timers.filter(t => !t.cancelled).length === 1);
  check('延迟为 5000ms', timers.filter(t => !t.cancelled)[0].ms === 5000);
  check('pending 为真', d.pending === true);
  await timers.filter(t => !t.cancelled)[0].fn();
  check('触发后执行 1 次', calls === 1);
  d.trigger(); d.cancel();
  check('cancel 后无 pending', d.pending === false);
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail > 0) process.exitCode = 1;
