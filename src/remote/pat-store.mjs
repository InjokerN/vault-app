// src/remote/pat-store.mjs — GitHub PAT 存放（FR-Y9 / FR-Y11 / ② §8.1 共享来源风险）
// 规格：默认只存内存（关页即失效）；显式勾选「记住此设备」才写 localStorage，
// 且界面必须标注风险（同源其他页面可读）。PAT 属凭据，绝不写日志、不进错误文案。
//
// 注入 storage（globalThis.sessionStorage / localStorage / 假实现），node 侧可测。
const MEM_KEY = 'vault.pat.memory';
const LS_KEY = 'vault.pat.remembered';

export class PatStore {
  constructor({ sessionStorage, localStorage } = {}) {
    this.session = sessionStorage || null;
    this.local = localStorage || null;
    this.memory = null; // 兜底：无任何 storage 时至少进程内存可见
  }

  // 读取：优先 localStorage（记住），其次 sessionStorage，最后内存。
  load() {
    try { if (this.local) { const v = this.local.getItem(LS_KEY); if (v) return v; } } catch {}
    try { if (this.session) { const v = this.session.getItem(MEM_KEY); if (v) return v; } } catch {}
    return this.memory;
  }

  // 保存。remember=true 才持久化到 localStorage（FR-Y11 需 UI 显式勾选）。
  save(pat, { remember = false } = {}) {
    if (typeof pat !== 'string' || !pat) throw new TypeError('PAT 不能为空');
    this.memory = pat;
    // sessionStorage 关标签页即失效，符合 FR-Y9 默认语义
    try { if (this.session) this.session.setItem(MEM_KEY, pat); } catch {}
    try {
      if (this.local) {
        if (remember) this.local.setItem(LS_KEY, pat);
        else this.local.removeItem(LS_KEY);
      }
    } catch {}
    return { remembered: !!remember };
  }

  clear() {
    this.memory = null;
    try { if (this.session) this.session.removeItem(MEM_KEY); } catch {}
    try { if (this.local) this.local.removeItem(LS_KEY); } catch {}
  }

  hasRemembered() {
    try { return !!(this.local && this.local.getItem(LS_KEY)); } catch { return false; }
  }
}
