// src/core/destroy.mjs — FR-SET4 销毁本地金库
// 规格：AGENT.md ① 2.9 FR-SET4、② §3「销毁本地金库」、③ §3.3、ADR-022、规则 5/6。
// 纯逻辑，node 侧可测；不直接依赖任何浏览器 API —— localStorage / IndexedDB 的删除
// 由调用方以回调注入（browser-bridge.mjs 注入真实实现，测试注入内存实现）。
//
// 顺序（规格五步）：
//  1. 前置：必须已解锁（内存有 dek + secretKey），否则 E_LOCKED，零改动
//  2. 校验主密码：借会话 Secret Key 解 wrapped_dek 与会话 DEK 比对（与 FR-K5 同构）
//     错 → E_UNLOCK，零改动。主密码单独不能解锁（ADR-022），但已解锁会话可校验。
//  3. 清本机：localStorage 的 vault.* 键 + IndexedDB 便利副本，分项 try/catch 收集错误
//  4. 清内存：lock(session) 丢弃 DEK / Secret Key；应用层负责清条目与 UI 会话、回解锁页
//  5. 边界：不删备份文件 / 远端 / SW 缓存（调用方无权限也无必要，本模块不触碰）
import { equalBytes } from '@noble/ciphers/utils.js';
import { buildAAD } from './aead.mjs';
import { deriveRawKey, deriveKEK, unwrapDEK } from './keys.mjs';
import { lock } from './session.mjs';

// 校验主密码是否属于当前已解锁金库。成功返回 meta，失败抛错且不产生任何副作用。
// 复用于 FR-SET4；与 FR-K5 rotateRecoveryCode 的校验完全同构。
// 异步是因为 store.loadMeta() 是 async（BrowserStore / MemStore 皆是）。
export async function verifyMasterPassword(store, session, masterPassword) {
  if (!(session && session.dek instanceof Uint8Array && session.secretKey instanceof Uint8Array))
    throw new Error('E_LOCKED');
  if (typeof masterPassword !== 'string' || !masterPassword)
    throw new Error('E_UNLOCK');
  const meta = await store.loadMeta();
  if (!meta) throw new Error('E_NO_VAULT');
  const aad = buildAAD({
    vaultId: meta.vaultId, deviceId: meta.deviceId, schema: 1, kdf: meta.kdf,
  });
  const raw = deriveRawKey(masterPassword, meta.salt);
  const kek = deriveKEK(raw, session.secretKey);
  let check;
  try {
    check = unwrapDEK(meta.wrapped_dek, kek, aad);
  } catch {
    throw new Error('E_UNLOCK');
  }
  if (!equalBytes(check, session.dek)) throw new Error('E_UNLOCK');
  return meta;
}

// 销毁本地金库。callbacks:
//   clearLocalKeys()        -> Promise|void  删除 localStorage 中本应用全部 vault.* 键
//   clearConvenience(vaultId) -> Promise|void 删除 IndexedDB 中该金库便利副本
// 两者可各自失败：失败项记入 errors，其余继续执行（规则 6「失败要吵、保留现场」，不静默吞）。
// 返回 { ok, vaultId, cleared: {localKeys, convenience}, errors: [...] }。
export async function destroyLocalVault(store, session, masterPassword, callbacks = {}) {
  // 1+2. 先校验，任何失败零改动
  const meta = await verifyMasterPassword(store, session, masterPassword);
  const { clearLocalKeys, clearConvenience } = callbacks;
  const errors = [];
  const cleared = { localKeys: false, convenience: false };

  // 3. 分项清除
  if (typeof clearLocalKeys === 'function') {
    try {
      await clearLocalKeys();
      cleared.localKeys = true;
    } catch (e) {
      errors.push({ item: 'localStorage', code: (e && e.message) || 'E_LOCAL_CLEAR_FAILED' });
    }
  } else {
    errors.push({ item: 'localStorage', code: 'E_NO_CALLBACK' });
  }
  if (typeof clearConvenience === 'function') {
    try {
      await clearConvenience(meta.vaultId);
      cleared.convenience = true;
    } catch (e) {
      errors.push({ item: 'IndexedDB', code: (e && e.message) || 'E_IDB_CLEAR_FAILED' });
    }
  } else {
    errors.push({ item: 'IndexedDB', code: 'E_NO_CALLBACK' });
  }

  // 4. 清内存会话（无论分项清除是否失败都要做，避免留着可用 DEK 的假 unlocked 态）
  lock(session);
  return {
    ok: errors.length === 0,
    vaultId: meta.vaultId,
    cleared,
    errors,
  };
}
