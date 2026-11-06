// src/core/hlc.mjs — 混合逻辑时钟（AGENT.md ② §HLC）
// 形状：{ l: 物理毫秒, c: 同毫秒内计数器, d: 设备 ID }
// 不用纯 wall clock：手机时间会回拨/不同步，纯时间戳排序会静默丢数据。

export function tick(local, deviceId, now = Date.now()) {
  const l = Math.max(now, local.l);
  const c = l === local.l ? local.c + 1 : 0;
  return { l, c, d: deviceId };
}

// 收到远端事件：l = max(l_local, l_remote, now)
export function receive(remote, local, deviceId, now = Date.now()) {
  const l = Math.max(local.l, remote.l, now);
  const c = l === local.l ? local.c + 1 : 0;
  return { l, c, d: deviceId };
}

// 比较：先 l，再 c，最后 d（deviceId 字典序）
export function compareHLC(a, b) {
  if (a.l !== b.l) return a.l - b.l;
  if (a.c !== b.c) return a.c - b.c;
  return a.d < b.d ? -1 : a.d > b.d ? 1 : 0;
}
