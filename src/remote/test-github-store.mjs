// src/remote/test-github-store.mjs — GitHubRemoteStore 行为（FR-Y1 / Q5=B）
// 用注入的假 fetch，不触网。覆盖：读写/list、base64 往返、sha 乐观锁、错误码映射、token 不泄露。
import { GitHubRemoteStore, makeFakeFetch } from './github-store.mjs';
import { REMOTE_ERRORS, assertRemoteStore } from './remote-store.mjs';

let pass = 0, fail = 0;
const check = (label, cond) => { console.log((cond ? '✓ ' : '❌ ') + label); cond ? pass++ : fail++; };
async function expectCode(label, fn, want) {
  try { await fn(); check(label + '（应报错）', false); }
  catch (e) { check(label + ' → ' + e.message, e.message === want); }
}
const TOKEN = 'ghp_supersecret_test_value';

// ── 契约自检 ──
check('接口自检通过', (() => { try { assertRemoteStore({ listFiles(){}, readFile(){}, writeFile(){} }); return true; } catch { return false; } })());
check('接口缺方法报错', (() => { try { assertRemoteStore({ readFile(){} }); return false; } catch { return true; } })());

// ── 读写往返 ──
const files = new Map();
const store = new GitHubRemoteStore({ owner: 'u', repo: 'data', token: TOKEN, fetchImpl: makeFakeFetch(files) });
const bytes = new TextEncoder().encode('vault-bytes-\u0000-\u00ff-密文');
const w = await store.writeFile('vault/snapshot.vaultenc', bytes);
check('写入返回 sha', !!w.sha);
const r = await store.readFile('vault/snapshot.vaultenc');
check('读回字节一致', new TextDecoder().decode(r.content) === new TextDecoder().decode(bytes));
check('读回带 sha', r.sha === w.sha);
check('listFiles 列出路径', (await store.listFiles('vault')).includes('vault/snapshot.vaultenc'));

// ── 乐观锁冲突 ──
await expectCode(
  '错误 sha 触发冲突',
  () => store.writeFile('vault/snapshot.vaultenc', bytes, 'bad-sha'),
  REMOTE_ERRORS.CONFLICT,
);
const afterConflict = await store.readFile('vault/snapshot.vaultenc');
check('冲突后远端内容未被改写', new TextDecoder().decode(afterConflict.content) === new TextDecoder().decode(bytes));

// ── 错误码映射 ──
for (const [status, want] of [[401, REMOTE_ERRORS.AUTH], [403, REMOTE_ERRORS.AUTH], [404, REMOTE_ERRORS.NOT_FOUND], [409, REMOTE_ERRORS.CONFLICT], [413, REMOTE_ERRORS.QUOTA], [500, REMOTE_ERRORS.NETWORK]]) {
  const bad = new GitHubRemoteStore({ owner: 'u', repo: 'd', token: 't', fetchImpl: makeFakeFetch(new Map(), { failStatus: status }) });
  await expectCode('HTTP ' + status, () => bad.readFile('x'), want);
}

// ── fetch 抛错映射为网络错误 ──
const thrower = new GitHubRemoteStore({ owner: 'u', repo: 'd', token: 't', fetchImpl: async () => { throw new Error('ECONNRESET'); } });
await expectCode('fetch 异常', () => thrower.readFile('x'), REMOTE_ERRORS.NETWORK);

// ── token 不进任何错误文案 / 结果 ──
const unauthorized = new GitHubRemoteStore({ owner: 'u', repo: 'd', token: TOKEN, fetchImpl: makeFakeFetch(new Map(), { failStatus: 401 }) });
try { await unauthorized.readFile('x'); } catch (e) {
  check('错误文案不含 token', !e.message.includes(TOKEN) && !String(e.stack || '').includes(TOKEN));
}
check('构造与写结果不回显 token', !JSON.stringify({ owner: store.owner, repo: store.repo, sha: w.sha }).includes(TOKEN));

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail > 0) process.exitCode = 1;
