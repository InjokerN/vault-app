// src/remote/github-store.mjs — GitHub RemoteStore 实现（FR-Y1 / Q5=B）
// 规格：AGENT.md ② §7.1、③ §1.2（PAT 不写死）、② §4（不引 libgit2，纯 REST contents）。
// HTTP 客户端注入（默认 globalThis.fetch），node 侧可传假 fetch 测试，不触网。
// PAT 只经 Authorization 头发送，不进 URL、不进错误文案、不落日志（规则 5 不假装安全）。
import { REMOTE_ERRORS, assertRemoteStore } from './remote-store.mjs';

const API = 'https://api.github.com';
const enc = new TextEncoder();
const dec = new TextDecoder();

// base64 <-> bytes：contents API 的 content 字段是 base64（可能带换行，需剥离）。
function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromBase64(str) {
  const clean = String(str).replace(/\s/g, '');
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// 把 fetch 响应映射为统一错误码。错误消息绝不含 token / 响应体里的敏感字段。
function mapHttpError(status, body) {
  if (status === 401 || status === 403) return REMOTE_ERRORS.AUTH;
  if (status === 404) return REMOTE_ERRORS.NOT_FOUND;
  if (status === 409 || status === 412) return REMOTE_ERRORS.CONFLICT;
  if (status === 413) return REMOTE_ERRORS.QUOTA;
  if (status >= 500) return REMOTE_ERRORS.NETWORK;
  return REMOTE_ERRORS.UNKNOWN;
}

export class GitHubRemoteStore {
  // { owner, repo, token, branch='main', fetchImpl }
  constructor({ owner, repo, token, branch = 'main', fetchImpl } = {}) {
    if (!owner || !repo || !token) {
      throw new TypeError('GitHubRemoteStore 需要 owner / repo / token');
    }
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    this.branch = branch;
    this.fetchImpl = fetchImpl || ((...a) => globalThis.fetch(...a));
  }

  _url(path) {
    return `${API}/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/contents/${path}?ref=${encodeURIComponent(this.branch)}`;
  }

  async _req(path, options = {}) {
    let res;
    try {
      res = await this.fetchImpl(this._url(path), {
        method: options.method || 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
    } catch {
      throw new Error(REMOTE_ERRORS.NETWORK);
    }
    if (!res.ok) {
      // 不把 body 原文拼进错误（可能含仓库信息），只给状态码供诊断。
      const code = mapHttpError(res.status);
      const err = new Error(code);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  // 连通性测试：只验仓库可达 + 凭据有权限。空仓（size=0、无分支）也返回 200。
  // 不用 contents 端点——新仓目录不存在会 404，把「还没推送过」误报成失败。
  async checkAccess() {
    const url = `${API}/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`;
    let res;
    try {
      res = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
    } catch {
      throw new Error(REMOTE_ERRORS.NETWORK);
    }
    if (!res.ok) {
      // 私有仓无权访问时 GitHub 返回 404（不泄露仓库是否存在），须当作认证失败
      const code = res.status === 404 ? REMOTE_ERRORS.AUTH : mapHttpError(res.status);
      const err = new Error(code);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    if (!data || !data.full_name) throw new Error(REMOTE_ERRORS.UNKNOWN);
    return { fullName: data.full_name, private: !!data.private, size: data.size, defaultBranch: data.default_branch };
  }

  async listFiles(prefix = '') {
    assertRemoteStore(this);
    const data = await this._req(prefix);
    if (!Array.isArray(data)) throw new Error(REMOTE_ERRORS.UNKNOWN);
    return data.map(x => x.path).filter(Boolean);
  }

  // 返回 { content: Uint8Array, sha }
  async readFile(path) {
    assertRemoteStore(this);
    const data = await this._req(path);
    if (!data || typeof data.content !== 'string') {
      throw new Error(REMOTE_ERRORS.NOT_FOUND);
    }
    return { content: fromBase64(data.content), sha: data.sha };
  }

  // content 为 Uint8Array；sha 传入则带乐观锁（PUT 的 body.sha）。
  async writeFile(path, content, sha) {
    assertRemoteStore(this);
    if (!(content instanceof Uint8Array)) {
      throw new TypeError('writeFile 需要 Uint8Array');
    }
    const body = {
      message: 'vault: sync snapshot',
      content: toBase64(content),
      branch: this.branch,
    };
    if (sha) body.sha = sha;
    const data = await this._req(path, { method: 'PUT', body });
    return { sha: data && data.content ? data.content.sha : null };
  }

  async deleteFile(path, sha) {
    assertRemoteStore(this);
    const body = { message: 'vault: archive', branch: this.branch };
    if (sha) body.sha = sha;
    await this._req(path, { method: 'DELETE', body });
  }
}

// 供测试用的假 fetch 构造器：给定路径表，返回符合 contents API 形状的响应。
export function makeFakeFetch(files = new Map(), { failStatus = null } = {}) {
  return async (url, opts = {}) => {
    if (failStatus) return { ok: false, status: failStatus, json: async () => ({}) };
    const u = new URL(url);
    // 仓库元数据端点（checkAccess 用）：/repos/{owner}/{repo}，无 /contents/ 段
    if (!u.pathname.includes('/contents/')) {
      const parts = u.pathname.split('/').filter(Boolean);
      const repo = parts[parts.length - 1];
      return {
        ok: true,
        status: 200,
        json: async () => ({ full_name: 'u/' + repo, private: true, size: 0, default_branch: 'main' }),
      };
    }
    // 去掉 /contents/ 前缀与 query
    const path = decodeURIComponent(u.pathname.split('/contents/')[1] || '');
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    if (method === 'GET') {
      if (files.has(path)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ path, content: files.get(path), sha: 'sha-' + path }),
        };
      }
      // 目录列举：返回该前缀下的一级条目（模拟 contents API 对目录返回数组）。
      const dir = path ? path.replace(/\/$/, '') + '/' : '';
      const children = [...files.keys()]
        .filter(k => k.startsWith(dir) && k.slice(dir.length) && !k.slice(dir.length).includes('/'))
        .map(k => ({ path: k, sha: 'sha-' + k }));
      if (children.length) return { ok: true, status: 200, json: async () => children };
      return { ok: false, status: 404, json: async () => ({}) };
    }
    if (method === 'PUT') {
      if (body.sha && !String(body.sha).startsWith('sha-')) {
        return { ok: false, status: 409, json: async () => ({}) };
      }
      files.set(path, body.content);
      return {
        ok: true,
        status: 200,
        json: async () => ({ content: { sha: 'sha-' + path } }),
      };
    }
    if (method === 'DELETE') {
      files.delete(path);
      return { ok: true, status: 200, json: async () => ({}) };
    }
    return { ok: false, status: 405, json: async () => ({}) };
  };
}
