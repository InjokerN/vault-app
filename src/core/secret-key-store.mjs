// src/core/secret-key-store.mjs — Secret Key 便利副本（ADR-015 / FR-K2 / FR-K3）
// 存 IndexedDB；③ §1.2 黑名单禁止把密钥材料写进 localStorage / sessionStorage。
// ADR-023：锁定金库时**保留**，只有用户主动点「清除」才删。
// 权威副本永远是用户手抄的 26 位恢复码（AGENT.md ② §3 本地结构说明）。
// [未确认] 规格未规定 IDB 库名 / object store 结构，此处为推荐实现。
const DB_NAME = 'vault-convenience';
const STORE = 'secret-keys';
const VERSION = 1;
const KEY_LEN = 16; // 128-bit Secret Key（ADR-014）

function openDB() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('E_IDB_UNAVAILABLE')); return; }
    let req;
    try { req = indexedDB.open(DB_NAME, VERSION); }
    catch { reject(new Error('E_IDB_OPEN_FAILED')); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'vaultId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('E_IDB_OPEN_FAILED'));
    req.onblocked = () => reject(new Error('E_IDB_BLOCKED'));
  });
}

// 失败一律显式抛错（README 规则 6「失败要吵」），不静默降级成「没有副本」。
async function run(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    let tx;
    try { tx = db.transaction(STORE, mode); }
    catch { db.close(); reject(new Error('E_IDB_TX_FAILED')); return; }
    const req = fn(tx.objectStore(STORE));
    let out;
    req.onsuccess = () => { out = req.result; };
    req.onerror = () => reject(new Error('E_IDB_REQUEST_FAILED'));
    tx.oncomplete = () => { db.close(); resolve(out); };
    tx.onerror = () => { db.close(); reject(new Error('E_IDB_TX_FAILED')); };
    tx.onabort = () => { db.close(); reject(new Error('E_IDB_TX_ABORTED')); };
  });
}

export async function saveSecretKey(vaultId, secretKey) {
  if (!vaultId || !(secretKey instanceof Uint8Array) || secretKey.length !== KEY_LEN)
    throw new TypeError('saveSecretKey 需要 vaultId 与 16B Secret Key');
  await run('readwrite', s => s.put({ vaultId, secretKey: new Uint8Array(secretKey) }));
}

export async function loadSecretKey(vaultId) {
  if (!vaultId) return null;
  const rec = await run('readonly', s => s.get(vaultId));
  return rec && rec.secretKey instanceof Uint8Array && rec.secretKey.length === KEY_LEN
    ? new Uint8Array(rec.secretKey) : null;
}

export async function clearSecretKey(vaultId) {
  if (!vaultId) return;
  await run('readwrite', s => s.delete(vaultId));
}
