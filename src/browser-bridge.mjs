// src/browser-bridge.mjs — 把 M1 加密核心暴露给原型 app.js（window.VaultCore）
// 浏览器原生 ESM；@noble 的裸说明符由 index.html 的 import map 映射到本地 node_modules。
import {
  setupVault, unlockVault, addRecord, lock,
  loadEntries, updateRecord, deleteRecord,
} from './core/session.mjs';
import { BrowserStore } from './core/browser-store.mjs';
import { saveSecretKey, loadSecretKey, clearSecretKey } from './core/secret-key-store.mjs';
import { vaultFingerprint, kdfSummary, matchRecoveryCode } from './core/vault-info.mjs';

window.VaultCore = {
  setupVault, unlockVault, addRecord, lock,
  loadEntries, updateRecord, deleteRecord, BrowserStore,
  // 便利副本（ADR-015 / FR-K2/K3/K4）
  saveSecretKey, loadSecretKey, clearSecretKey, matchRecoveryCode,
  // 设置页真实数据（③ §5）
  vaultFingerprint, kdfSummary,
};
