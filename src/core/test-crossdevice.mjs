// src/core/test-crossdevice.mjs — 跨设备恢复回归：验证 deviceId 错位不再导致误报「数据损坏」
// 复现场景：手机先有自己的金库(旧分片 d-mobile) → 导入桌面备份 → 解锁 → 加载 → 新增 → 再解锁
import { BrowserStore } from './browser-store.mjs';
import { setupVault, unlockVault, addRecord, loadEntries } from './session.mjs';
import { exportBackup, importBackup } from './backup.mjs';

function makeLS() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    clear: () => m.clear(), _m: m,
  };
}
let LS = makeLS();
globalThis.localStorage = LS;
function use(ls) { LS = ls; globalThis.localStorage = ls; }
function getDeviceId() {
  let d = LS.getItem('vault.deviceId');
  if (!d) { d = 'd-' + Math.random().toString(36).slice(2, 10); LS.setItem('vault.deviceId', d); }
  return d;
}

const MP = 'cross-device-pass';
let pass = 0, fail = 0;
const check = (label, cond) => { console.log((cond ? '✓ ' : '❌ ') + label); cond ? pass++ : fail++; };

// ── 桌面：金库 + 13 条（含中文）──
use(makeLS()); LS.setItem('vault.deviceId', 'd-desktop');
const sD = new BrowserStore('vault');
const dS = await setupVault(sD, { masterPassword: MP, vaultId: 'v1', deviceId: getDeviceId() });
for (let i = 0; i < 13; i++) await addRecord(sD, dS.session, { plaintext: { id: 'e' + i, title: '条目' + i, note: '中文' + i } });
const file = await exportBackup(sD, dS.session);
check('桌面导出 13 条', file.head.count === 13 && file.head.deviceId === 'd-desktop');

// ── 手机：先建自己的金库（产生残留旧分片 d-mobile）──
use(makeLS()); LS.setItem('vault.deviceId', 'd-mobile');
const sM = new BrowserStore('vault');
const mS = await setupVault(sM, { masterPassword: 'mobile-own', vaultId: 'v1', deviceId: getDeviceId() });
await addRecord(sM, mS.session, { plaintext: { id: 'own', title: '手机自建' } });
check('手机旧分片存在', (await sM.loadShard('d-mobile')).length === 1);

// ── 导入桌面备份 ──
const imp = await importBackup(sM, file, { masterPassword: MP, recoveryCode: dS.recoveryCode });
check('导入后 meta.deviceId = 来源 d-desktop', (await sM.loadMeta()).deviceId === 'd-desktop');

// 模拟 app.js 修复：把本机 deviceId 对齐到导入来源
LS.setItem('vault.deviceId', imp.meta.deviceId);
check('本机 getDeviceId 已对齐', getDeviceId() === 'd-desktop');

// ── 解锁 + 加载 ──
const u = await unlockVault(sM, { masterPassword: MP, deviceId: getDeviceId(), secretKey: imp.secretKey });
const ents = await loadEntries(sM, { dek: u.dek });
check('跨设备恢复后解锁加载 = 13 条', ents.length === 13);

// ── 新增一条再解锁，确认 deviceId 一致、数据不丢 ──
await addRecord(sM, { dek: u.dek }, { plaintext: { id: 'e13', title: '新增' } });
const u2 = await unlockVault(sM, { masterPassword: MP, deviceId: getDeviceId(), secretKey: imp.secretKey });
const ents2 = await loadEntries(sM, { dek: u2.dek });
check('新增后再次解锁 = 14 条', ents2.length === 14);

// ── 即使本机 deviceId 未对齐（仍=d-mobile），修复后的 unlockVault 也应正确（用 meta.deviceId）──
use(makeLS()); LS.setItem('vault.deviceId', 'd-mobile'); // 全新手机，直接导入
const sM2 = new BrowserStore('vault');
const mS2 = await setupVault(sM2, { masterPassword: 'x', vaultId: 'v1', deviceId: getDeviceId() });
await addRecord(sM2, mS2.session, { plaintext: { id: 'o', title: 't' } });
const imp2 = await importBackup(sM2, file, { masterPassword: MP, recoveryCode: dS.recoveryCode });
// 注意：此处故意不执行 app.js 的对齐，模拟旧设备残留 deviceId=d-mobile
const u3 = await unlockVault(sM2, { masterPassword: MP, deviceId: getDeviceId(), secretKey: imp2.secretKey });
const ents3 = await loadEntries(sM2, { dek: u3.dek });
check('未对齐 deviceId 时修复版 unlockVault 仍=13 条（旧版会误报损坏）', ents3.length === 13);

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail) process.exit(1);
