// src/core/sync.mjs — M3-A 同步编排：整库密文快照推送 / 拉取恢复
// 规格：AGENT.md ④ M3-A、② §7.3 同步时序、FR-Y1/Y2/Y5/Y10、规则 5/6。
// 纯逻辑，remote 以接口注入（RemoteStore），node 侧可用假实现测试，不触网。
//
// 安全基线（复用已验证的 backup.mjs，零新密码学）：
//  · 推送 = exportBackup（生成 .vaultenc 对象）→ JSON 序列化 → writeFile（带 sha 乐观锁）
//  · 拉取 = readFile → JSON.parse → importBackup（摘要→解密→哈希链→全部通过才落盘）
//  · 任一失败抛错且本地不动（FR-Y5）；覆盖本地前由 UI 层二次确认（core 不擅自覆盖语义）。
import { exportBackup, importBackup } from './backup.mjs';
// 不 import remote/ —— core 保持纯逻辑。远端错误码在此以字面量比对（与 remote-store.mjs 的 REMOTE_ERRORS 约定一致）。
const ASSERT_REMOTE = (r) => {
  for (const m of ['listFiles', 'readFile', 'writeFile']) {
    if (!r || typeof r[m] !== 'function') throw new TypeError('RemoteStore 缺少方法：' + m);
  }
};
const E_NOT_FOUND = 'E_NOT_FOUND';

const enc = new TextEncoder();
const dec = new TextDecoder();
export const DEFAULT_SNAPSHOT_PATH = 'vault/snapshot.vaultenc';

// 推送整库快照。返回 { path, sha, bytes, alreadyClean }。
// 乐观锁：先读远端 sha（不存在则 null），writeFile 带上；409 → 交给上层重试（FR-Y2 阶段一用简单重试）。
export async function pushSnapshot(store, session, remote, path = DEFAULT_SNAPSHOT_PATH) {
  ASSERT_REMOTE(remote);
  const file = await exportBackup(store, session);
  const bytes = enc.encode(JSON.stringify(file));
  let sha = null;
  try {
    const prev = await remote.readFile(path);
    sha = prev.sha || null;
  } catch (e) {
    if (e.message !== E_NOT_FOUND) throw e; // 非「不存在」的错误要吵，不能当成首次推送
  }
  const res = await remote.writeFile(path, bytes, sha);
  return { path, sha: res.sha, bytes: bytes.length };
}

// 拉取远端快照为对象（未落盘）。供 UI 先预览/确认，再调 restoreSnapshot。
export async function fetchSnapshot(remote, path = DEFAULT_SNAPSHOT_PATH) {
  ASSERT_REMOTE(remote);
  const { content } = await remote.readFile(path);
  try {
    return JSON.parse(dec.decode(content));
  } catch {
    throw new Error('E_BACKUP_CORRUPT');
  }
}

// 恢复：把快照对象落到本机。creds = { masterPassword, recoveryCode }。
// 所有校验在 importBackup 内完成且「全部通过才写盘」——失败本机数据绝不被清空/覆盖。
export async function restoreSnapshot(store, snapshot, creds) {
  return importBackup(store, snapshot, creds);
}

// 一步到位的拉取恢复（UI 二次确认后调用）。
export async function pullSnapshot(store, remote, path, creds) {
  const snap = await fetchSnapshot(remote, path || DEFAULT_SNAPSHOT_PATH);
  return restoreSnapshot(store, snap, creds);
}

// 5s 防抖调度器（FR-Y2）。返回 { trigger, cancel, pending }。
// fn 为异步同步函数；重复 trigger 重置计时；失败不吞，向上抛（上层记为 error 状态）。
export function createDebouncer(fn, delayMs = 5000, timerImpl = {}) {
  const setT = timerImpl.setTimeout || ((f, ms) => setTimeout(f, ms));
  const clearT = timerImpl.clearTimeout || ((id) => clearTimeout(id));
  let timer = null;
  let generation = 0;
  const api = {
    trigger(...args) {
      if (timer !== null) clearT(timer);
      const gen = ++generation;
      timer = setT(async () => {
        timer = null;
        if (gen !== generation) return; // 失效的旧任务
        await fn(...args);
      }, delayMs);
    },
    cancel() {
      generation++;
      if (timer !== null) { clearT(timer); timer = null; }
    },
    get pending() { return timer !== null; },
  };
  return api;
}
