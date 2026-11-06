// src/core/store.mjs — 存储抽象（AGENT.md ② §3 存储布局）
// 先用内存实现验证逻辑；后续替换为 IndexedDB（本地）与 GitHub contents（远端）。
// 注意：nonce / ciphertext / record_hash 均为 Uint8Array，需用结构化克隆保留类型。
export class MemStore {
  constructor() {
    this.meta = null;
    this.shards = {};
  }
  _clone(o) {
    return structuredClone ? structuredClone(o) : JSON.parse(JSON.stringify(o));
  }
  async saveMeta(m) {
    this.meta = this._clone(m);
  }
  async loadMeta() {
    return this.meta ? this._clone(this.meta) : null;
  }
  async saveShard(deviceId, records) {
    this.shards[deviceId] = records.map((r) => this._clone(r));
  }
  async loadShard(deviceId) {
    return (this.shards[deviceId] || []).map((r) => this._clone(r));
  }
}
