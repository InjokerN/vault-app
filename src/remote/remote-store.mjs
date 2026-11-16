// src/remote/remote-store.mjs — 远端存储抽象（Q5=B、FR-Y7）
// 规格：AGENT.md ② §7.1 仓库结构、⑤ Q5 已定 B。
// 只定义契约与统一错误码，不含任何 HTTP 实现 —— 便于换 WebDAV / 本地目录 / 自建，
// 也让 node 侧可用假实现测试同步逻辑。
//
// 契约：
//   listFiles(prefix)        -> Promise<string[]>             列出前缀下的文件路径
//   readFile(path)           -> Promise<{content, sha}>       读文件（content 为 base64 字符串）
//   writeFile(path, content, sha?) -> Promise<{sha}>          写文件；sha 为乐观锁（可选）
//   checkAccess()            -> Promise<boolean>               验仓库可达 + 凭据有权限（不依赖目录/分支存在）
//   deleteFile(path, sha?)   -> Promise<void>                 删文件（M3-B 归档用，阶段一可空实现）
//
// 统一错误码（各实现必须映射到此表，UI 据此显示文案）：
//   E_NETWORK         网络失败
//   E_AUTH            PAT 无效 / 过期 / 权限不足
//   E_NOT_FOUND       文件不存在
//   E_CONFLICT        sha 不匹配（乐观锁失败，对应 HTTP 409）
//   E_REMOTE_QUOTA    远端配额 / 单文件超限
//   E_REMOTE_UNKNOWN  其他远端错误

export const REMOTE_ERRORS = Object.freeze({
  NETWORK: 'E_NETWORK',
  AUTH: 'E_AUTH',
  NOT_FOUND: 'E_NOT_FOUND',
  CONFLICT: 'E_CONFLICT',
  QUOTA: 'E_REMOTE_QUOTA',
  UNKNOWN: 'E_REMOTE_UNKNOWN',
});

// 接口自检：实现一个 RemoteStore 时必须提供这些方法。抛错即契约不符（失败要吵，规则 6）。
export function assertRemoteStore(store) {
  for (const m of ['listFiles', 'readFile', 'writeFile']) {
    if (!store || typeof store[m] !== 'function') {
      throw new TypeError('RemoteStore 缺少方法：' + m);
    }
  }
}
