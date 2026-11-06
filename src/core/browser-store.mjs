// src/core/browser-store.mjs — 浏览器端 store 实现（localStorage 后端）
// 满足 session.mjs 的接口：saveMeta / loadMeta / saveShard / loadShard（均为 async）
// 注意：wrapped_dek / salt / nonce / ciphertext / record_hash / prev_hash 等均为 Uint8Array，
// 用 base64 中转以便 JSON 序列化；读取时还原，保证 verifyChain / 解密字节无损。

const b64enc = (u) => {
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
};
const b64dec = (s) => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const replacer = (_k, v) => (v instanceof Uint8Array ? { __b64: b64enc(v) } : v);
const reviver = (_k, v) => (v && v.__b64 ? b64dec(v.__b64) : v);

export class BrowserStore {
  constructor(prefix = 'vault') {
    this.prefix = prefix;
  }
  async saveMeta(meta) {
    localStorage.setItem(this.prefix + '.meta', JSON.stringify(meta, replacer));
  }
  async loadMeta() {
    const s = localStorage.getItem(this.prefix + '.meta');
    return s ? JSON.parse(s, reviver) : null;
  }
  async saveShard(deviceId, records) {
    localStorage.setItem(this.prefix + '.shard.' + deviceId, JSON.stringify(records, replacer));
  }
  async loadShard(deviceId) {
    const s = localStorage.getItem(this.prefix + '.shard.' + deviceId);
    return s ? JSON.parse(s, reviver) : [];
  }
}
