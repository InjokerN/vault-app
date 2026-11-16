// src/browser-bridge.mjs — 把 M1 加密核心暴露给原型 app.js（window.VaultCore）
// 浏览器原生 ESM；@noble 的裸说明符由 index.html 的 import map 映射到自托管的 ./vendor/。
import {
  setupVault, unlockVault, addRecord, lock,
  loadEntries, updateRecord, deleteRecord,
} from './core/session.mjs';
import { BrowserStore } from './core/browser-store.mjs';
import { saveSecretKey, loadSecretKey, clearSecretKey, clearAllSecretKeys } from './core/secret-key-store.mjs';
import { vaultFingerprint, kdfSummary, matchRecoveryCode } from './core/vault-info.mjs';
import { exportBackup, importBackup, rotateRecoveryCode } from './core/backup.mjs';
import { destroyLocalVault, verifyMasterPassword } from './core/destroy.mjs';
import { GitHubRemoteStore } from './remote/github-store.mjs';
import { PatStore } from './remote/pat-store.mjs';
import { pushSnapshot, fetchSnapshot, createDebouncer, DEFAULT_SNAPSHOT_PATH } from './core/sync.mjs';

// FR-SET4：把真实浏览器 IO 注入 core 的纯逻辑。删除本应用全部 vault.* 键——
// 包括 meta / shard / deviceId / sort / order / registry（② §3「销毁本地金库」）。
function clearLocalVaultKeys() {
  const doomed = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('vault.')) doomed.push(k);
  }
  for (const k of doomed) localStorage.removeItem(k);
  return doomed.length;
}

// 高层封装：校验 + 清本机 + 清便利副本 + 清内存，全部在 core 完成，app.js 只传会话与主密码。
async function destroyVault(store, session, masterPassword) {
  return destroyLocalVault(store, session, masterPassword, {
    clearLocalKeys: clearLocalVaultKeys,
    clearConvenience: clearAllSecretKeys,
  });
}

// M3-A 同步封装：把浏览器 IO 注入 RemoteStore / PatStore，app.js 只传配置与凭据。
const patStore = new PatStore({
  sessionStorage: globalThis.sessionStorage,
  localStorage: globalThis.localStorage,
});

function makeRemote({ repo, branch, token }) {
  const [owner, name] = String(repo || '').split('/');
  if (!owner || !name) throw new TypeError('仓库格式应为 owner/repo');
  return new GitHubRemoteStore({ owner, repo: name, token, branch: branch || 'main' });
}

async function syncPush(store, session, config) {
  const remote = makeRemote(config);
  return pushSnapshot(store, session, remote);
}
// 拉取恢复走 syncFetch + app.js 的 importmodal（二次确认 + 主密码/恢复码），
// 不在此处直接 pullSnapshot —— core 不擅自执行覆盖语义，覆盖前须 UI 二次确认。
async function syncTest(config) {
  const remote = makeRemote(config);
  await remote.listFiles('vault'); // 能列目录即认证+权限通过
  return true;
}
async function syncFetch(config) {
  const remote = makeRemote(config);
  return fetchSnapshot(remote, DEFAULT_SNAPSHOT_PATH);
}

window.VaultCore = {
  setupVault, unlockVault, addRecord, lock,
  loadEntries, updateRecord, deleteRecord, BrowserStore,
  // 便利副本（ADR-015 / FR-K2/K3/K4）
  saveSecretKey, loadSecretKey, clearSecretKey, clearAllSecretKeys, matchRecoveryCode,
  // 设置页真实数据（③ §5）
  vaultFingerprint, kdfSummary,
  // 备份 / 恢复 / 重新生成恢复码（ADR-020/021、FR-SET2/SET3、FR-K5）
  exportBackup, importBackup, rotateRecoveryCode,
  // 销毁本地金库（FR-SET4）
  destroyVault, verifyMasterPassword,
  // M3-A 远端备份兜底
  syncPush, syncFetch, syncTest, patStore, createDebouncer,
};
