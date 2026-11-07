/* VAULT — 原型交互层
   数据是占位密文；真实实现里这些字段来自解密后的金库。
   模型对齐 AGENT.md ⑤：ADR-012 标签、ADR-013 身份账户与登录方式。 */

/* 标签名称注册表：只存"存在哪些标签"，成员关系一律在 entry.tags 上（ADR-012） */
let TAGS = ['核心', '开发', '运维', '支付', '购物', '写作'];

const SAMPLE_ENTRIES = [
  /* ── 身份账户（IdP） ── */
  { id:'idp-wechat', type:'account', title:'微信', user:'139 0000 1234',
    loginMethod:null, url:'weixin.qq.com', tags:['核心'], strength:4, updated:'11-04 21:12',
    fields:[
      {k:'账号', v:'139 0000 1234'},
      {k:'密码', v:'Wx3%Tn6kYb9@Mc2f', secret:true, hint:'16 个字符 · 强'},
      {k:'两步验证', v:'已开启 · 手机短信'},
      {k:'恢复码', v:'8f2a19c4 b7d03e56', secret:true, hint:'微信安全中心生成'},
    ],
    notes:'京东、小红书、闲鱼都靠它登录。改密码时这几处要重新授权。',
    hist:[['11-04 21:12','密码已更换'],['03-02 10:00','创建']] },

  { id:'idp-google', type:'account', title:'Google', user:'yg.design@gmail.com',
    loginMethod:null, url:'accounts.google.com', tags:['核心'], strength:4, updated:'10-30 16:20',
    fields:[
      {k:'账号', v:'yg.design@gmail.com'},
      {k:'密码', v:'Gk2!vN9sWq4#Zr7m', secret:true, hint:'16 个字符 · 强'},
      {k:'两步验证', v:'已开启 · 身份验证器'},
      {k:'恢复码', v:'3f9a-2c71 8d04-56be', secret:true, hint:'10 个，已用 1'},
    ],
    notes:'Notion 用它登录。',
    hist:[['10-30 16:20','创建']] },

  /* ── 登录（自有密码） ── */
  { id:'github', type:'login', title:'GitHub', user:'yg@dev.local', loginMethod:'password',
    url:'github.com', tags:['核心','开发'], strength:4, updated:'11-04 21:12',
    fields:[
      {k:'用户名', v:'yg@dev.local'},
      {k:'密码',   v:'Xk9#mQ2vLp7$Rt4w', secret:true, hint:'16 个字符 · 强'},
      {k:'网址',   v:'https://github.com', link:true},
    ],
    notes:'个人主账号。2FA 已开启，恢复码存于「GitHub 恢复码」笔记。',
    hist:[['11-04 21:12','密码已更换'],['10-12 09:30','新增字段 API Token'],['08-02 14:00','创建']] },

  { id:'figma', type:'login', title:'Figma', user:'yg.design@gmail.com', loginMethod:'password',
    url:'figma.com', tags:['开发'], strength:4, updated:'11-03 09:40',
    fields:[
      {k:'用户名', v:'yg.design@gmail.com'},
      {k:'密码',   v:'Bq4!yT8nHe#2Kx9', secret:true, hint:'16 个字符 · 强'},
      {k:'网址',   v:'https://figma.com', link:true},
    ],
    notes:'设计稿主工作区。',
    hist:[['11-03 09:40','密码已更换'],['06-21 18:22','创建']] },

  { id:'cloudflare', type:'login', title:'Cloudflare', user:'admin@yg.io', loginMethod:'password',
    url:'dash.cloudflare.com', tags:['核心','运维'], strength:4, updated:'10-29 15:02',
    fields:[
      {k:'用户名', v:'admin@yg.io'},
      {k:'密码',   v:'Zm7#Lp3qVr8$Wn5c', secret:true, hint:'16 个字符 · 强'},
      {k:'网址',   v:'https://dash.cloudflare.com', link:true},
    ],
    notes:'DNS 与 Workers。API Token 单独存放。',
    hist:[['10-29 15:02','备注更新'],['05-30 10:11','创建']] },

  { id:'aliyun', type:'login', title:'阿里云 RAM', user:'yg-ops@aliyun.com', loginMethod:'password',
    url:'ram.console.aliyun.com', tags:['运维'], strength:3, updated:'10-27 11:18',
    fields:[
      {k:'用户名', v:'yg-ops@aliyun.com'},
      {k:'密码',   v:'Rt2$kD9sJh4#Fg6b', secret:true, hint:'16 个字符 · 中'},
      {k:'网址',   v:'https://ram.console.aliyun.com', link:true},
    ],
    notes:'子账号，仅授予 OSS 与 ECS 最小权限。',
    hist:[['10-27 11:18','权限收紧'],['04-08 20:45','创建']] },

  /* ── 登录（第三方，没有本站密码） ── */
  { id:'notion', type:'login', title:'Notion', user:'yg.design@gmail.com',
    loginMethod:'oauth', idp:'idp-google',
    url:'notion.so', tags:['写作'], strength:null, updated:'10-22 20:05',
    fields:[
      {k:'绑定账号', v:'yg.design@gmail.com'},
      {k:'网址', v:'https://notion.so', link:true},
    ],
    notes:'只能用 Google 或 Apple 登录，Notion 侧没有独立密码。',
    hist:[['10-22 20:05','创建']] },

  { id:'jd', type:'login', title:'京东', user:'139 0000 1234',
    loginMethod:'oauth', idp:'idp-wechat',
    url:'jd.com', tags:['购物'], strength:null, updated:'10-25 12:03',
    fields:[
      {k:'绑定账号', v:'139****1234'},
      {k:'网址', v:'https://jd.com', link:true},
    ],
    notes:'只支持微信/手机号登录。',
    hist:[['10-25 12:03','创建']] },

  { id:'xhs', type:'login', title:'小红书', user:'139 0000 1234',
    loginMethod:'oauth', idp:'idp-wechat',
    url:'xiaohongshu.com', tags:['购物'], strength:null, updated:'10-24 19:40',
    fields:[
      {k:'绑定账号', v:'139****1234'},
      {k:'网址', v:'https://xiaohongshu.com', link:true},
    ],
    notes:'',
    hist:[['10-24 19:40','创建']] },

  { id:'xianyu', type:'login', title:'闲鱼', user:'139 0000 1234',
    loginMethod:'oauth', idp:'idp-wechat',
    url:'2.taobao.com', tags:['购物'], strength:null, updated:'10-24 19:41',
    fields:[
      {k:'绑定账号', v:'139****1234'},
      {k:'网址', v:'https://2.taobao.com', link:true},
    ],
    notes:'',
    hist:[['10-24 19:41','创建']] },

  /* ── 其它类型 ── */
  { id:'bank-card', type:'card', title:'招商银行 · 储蓄卡', user:'6225 **** **** 4021',
    loginMethod:null, url:null, tags:['支付'], strength:null, updated:'09-30 08:00',
    fields:[
      {k:'卡号',     v:'6225 8812 7734 4021', secret:true, hint:'借记卡'},
      {k:'有效期',   v:'09/28'},
      {k:'CVV',      v:'417', secret:true},
      {k:'取款密码', v:'582913', secret:true, hint:'6 位数字'},
    ],
    notes:'网银盾口令见「微信」条目备注。',
    hist:[['09-30 08:00','换卡更新'],['02-14 12:00','创建']] },

  { id:'github-codes', type:'note', title:'GitHub 恢复码', user:null,
    loginMethod:null, url:null, tags:['核心'], strength:null, updated:'10-12 09:31',
    fields:[ {k:'恢复码', v:'8f2a-19c4  b7d0-3e56\n4a91-02cd  f8b3-17ea\n9c25-6e08  3d7f-b1a4', secret:true, multiline:true, hint:'共 10 个 · 已用 2'} ],
    notes:'打印一份并放入保险柜。',
    hist:[['10-12 09:31','生成并写入'],['08-02 14:00','创建']] },

  { id:'server-note', type:'note', title:'服务器清单', user:null,
    loginMethod:null, url:null, tags:['运维'], strength:null, updated:'09-02 13:40',
    fields:[ {k:'清单', v:'prod-1  10.0.0.11   root\nprod-2  10.0.0.12   root\nstage   10.0.1.30   deploy', secret:true, multiline:true, hint:'3 台 · SSH 密钥已录入'} ],
    notes:'SSH 私钥口令与各机 sudo 密码不同，逐条录入。',
    hist:[['09-02 13:40','更新清单'],['07-11 09:00','创建']] },

  { id:'identity', type:'identity', title:'身份信息', user:'YG',
    loginMethod:null, url:null, tags:[], strength:null, updated:'08-15 10:00',
    fields:[
      {k:'证件号', v:'110101********4018', secret:true, hint:'脱敏显示'},
      {k:'常用地址', v:'北京市 海淀区 中关村大街 27 号'},
    ],
    notes:'仅存高频填表字段。',
    hist:[['08-15 10:00','创建']] },
];

/* 收藏：演示数据里先标三条（FR-E6 收藏置顶）
   M1 后 ENTRIES 改为解锁时解密填充（let 声明在下方），
   此处顶层立即执行，必须作用于示例数据源 SAMPLE_ENTRIES，否则落入 TDZ。 */
['idp-wechat', 'github', 'bank-card'].forEach(id => {
  const e = SAMPLE_ENTRIES.find(x => x.id === id);
  if (e) e.fav = true;
});

/* ── 类型注册表：内置五类不可删，可新增 / 重命名的自定义类型（FR-E8 / ADR-029） ── */
let TYPES = [
  { key:'login',    label:'登录',     builtin:true },
  { key:'account',  label:'身份账户', builtin:true },
  { key:'card',     label:'卡片',     builtin:true },
  { key:'note',     label:'安全笔记', builtin:true },
  { key:'identity', label:'身份信息', builtin:true },
];

// 侧边栏拖拽中的来源项；声明在文件前部，避免顶层立即执行时落入 TDZ
let dragCat = null;
// 启动深链（?view=vault / ?view=settings）的目标视图，解锁成功后再跳（② §7.5）
let PENDING_VIEW = null;

/* ── 类型 / 标签注册表持久化（③ §3）──
   [未确认] 目前按 UI 偏好明文写入 localStorage（与 vault.sort / vault.order 一致），
   不存密钥材料；长期是否改为随金库密文一起存，待 YG 拍板。 */
const REG_KEY = 'vault.registry.v1';
const DEFAULT_TYPES = TYPES.map(t => ({ ...t }));
const RAIL_FAV = '__fav__';       // 「★ 收藏」在侧边栏顺序数组里的伪 key
let RAIL_ORDER = null;            // null = 默认：收藏在最前，其后按 TYPES 顺序

function railKeys(){ return [RAIL_FAV, ...TYPES.map(t => t.key)]; }
function railOrder(){
  const base = railKeys();
  if (!Array.isArray(RAIL_ORDER)) return base;
  const out = [], seen = new Set();
  for (const k of RAIL_ORDER) if (base.includes(k) && !seen.has(k)){ seen.add(k); out.push(k); }
  for (const k of base) if (!seen.has(k)){ seen.add(k); out.push(k); }  // 新增类型追加末尾
  return out;
}
// 让「分类分组」排序继续跟随侧边栏顺序（③ §3：按类型注册表顺序分组）
function syncTypesFromRail(){
  const byKey = new Map(TYPES.map(t => [t.key, t]));
  TYPES = railOrder().filter(k => k !== RAIL_FAV).map(k => byKey.get(k)).filter(Boolean);
}

function saveRegistry(){
  try { localStorage.setItem(REG_KEY, JSON.stringify({ types: TYPES, tags: TAGS, railOrder: railOrder() })); }
  catch (e) { toast('类型 / 标签保存失败：' + (e.message || '未知错误')); }
}

function loadRegistry(){
  try {
    const raw = localStorage.getItem(REG_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (Array.isArray(d.types) && d.types.length){
      const out = [], seen = new Set();
      for (const t of d.types){
        if (!t || typeof t.key !== 'string' || typeof t.label !== 'string' || seen.has(t.key)) continue;
        seen.add(t.key);
        out.push(t.builtin
          ? { key: t.key, label: t.label, builtin: true }
          : { key: t.key, label: t.label, builtin: false,
              template: Array.isArray(t.template) ? t.template : [] });
      }
      for (const def of DEFAULT_TYPES){          // 内置五类必须齐全，防旧数据 / 损坏
        if (!out.some(t => t.key === def.key)) out.push({ ...def });
      }
      TYPES = out;
    }
    if (Array.isArray(d.tags)){
      const out = [], seen = new Set();
      for (const t of d.tags){
        if (typeof t !== 'string' || !t.trim() || seen.has(t)) continue;
        seen.add(t); out.push(t);
      }
      TAGS = out;
    }
    if (Array.isArray(d.railOrder)){ RAIL_ORDER = d.railOrder; syncTypesFromRail(); }
  } catch (e) {
    toast('类型 / 标签读取失败，已用默认值：' + (e.message || '未知错误'));
  }
}

function typeMeta(key){
  return TYPES.find(t => t.key === key) || { key, label:'未知类型', builtin:true };
}
function typeLabel(key){ return typeMeta(key).label; }
const typeOrderKeys = () => TYPES.map(t => t.key);

/* 登录方式的默认字段：只有「密码登录」才有密码字段 */
const METHOD_FIELDS = {
  password: [{ k:'用户名', v:'' }, { k:'密码', v:'', secret:true }],
  oauth:    [{ k:'绑定账号', v:'' }],
  otp:      [{ k:'手机号 / 邮箱', v:'' }],
  passkey:  [{ k:'登录名', v:'' }],
};

/* 各内置类型的默认字段结构 */
const TYPE_FIELDS = {
  account:  [{ k:'账号', v:'' }, { k:'密码', v:'', secret:true }, { k:'两步验证', v:'' }, { k:'恢复码', v:'', secret:true }],
  card:     [{ k:'卡号', v:'', secret:true }, { k:'有效期', v:'' }, { k:'CVV', v:'', secret:true }, { k:'取款密码', v:'', secret:true }],
  note:     [{ k:'内容', v:'', secret:true, multiline:true }],
  identity: [{ k:'证件号', v:'', secret:true }, { k:'常用地址', v:'' }],
};

function fieldsFor(typeKey, method){
  if (typeKey === 'login'){
    return (METHOD_FIELDS[method] || METHOD_FIELDS.password).map(f => ({ ...f }));
  }
  const custom = TYPES.find(t => t.key === typeKey);
  if (custom && !custom.builtin) return (custom.template || []).map(f => ({
    k: f.k || '', v: f.v ?? '', secret: !!f.secret, multiline: !!f.multiline,
  }));
  return (TYPE_FIELDS[typeKey] || []).map(f => ({ ...f }));
}

const METHOD_META = {
  password: '密码登录',
  oauth:    '第三方登录',
  otp:      '验证码登录',
  passkey:  '通行密钥',
};

const state = { view:'unlock', cat:'all', tag:null, q:'', selected:'idp-wechat',
                secretVisible:{}, tagMode:'create', tagTarget:null, renaming:null,
                editing:null, draft:null, sort:'time', order:null, typeRenaming:null,
                fav:false, confirmCb:null, tplDraft:null, tplTarget:null, typeDraft:null };

/* ── M1 加密会话（接 src/browser-bridge.mjs 的 window.VaultCore）── */
let VAULT = null;        // 运行时会话：{dek, deviceId, vaultId, recoveryCode?}
let STORE = null;        // VaultCore.BrowserStore 实例
let SETUP_MODE = false;  // 是否处于"首次创建金库"模式
function getDeviceId(){
  let d = localStorage.getItem('vault.deviceId');
  if (!d){ d = 'd-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('vault.deviceId', d); }
  return d;
}
// 解锁后由解密数据填充；未解锁时为空，避免原型硬编码示例泄露到真实金库
let ENTRIES = [];
// 便利副本一律从 IndexedDB 现读（ADR-015）；不在全局内存缓存 Secret Key，
// 避免锁定后残留明文（FR-U5）或界面状态与实际凭据脱节（规则 5）。

/* ── 工具 ── */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function toast(msg, tail){
  const t = $('#toast');
  t.innerHTML = tail ? `${msg}<span class="mono">${tail}</span>` : msg;
  t.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove('on'), 1800);
}

function markChar(e){
  if (e.type === 'card') return '◆';
  if (e.type === 'note') return '≡';
  if (e.type === 'identity') return '◇';
  return (e.title || '?').trim().charAt(0).toUpperCase();
}

function setView(name){
  state.view = name;
  $$('.view').forEach(v => v.classList.remove('active'));
  $('#view-' + name).classList.add('active');
  if (name !== 'vault') setRailOpen(false);
}

async function unlock(){
  if (!STORE) STORE = new VaultCore.BrowserStore('vault');
  const pw = $('#master').value;
  if (!pw){ toast('请输入主密码'); return; }
  const meta = await STORE.loadMeta();
  if (!meta){ toast('金库不存在'); return; }
  // ADR-015：优先用本机便利副本，日常只需主密码；用户手输恢复码则用手输的（可绕过不匹配的旧副本）
  // 每次都从 IndexedDB 现读，不用内存缓存：锁定后状态与凭据必须同源，避免界面说「未保存」却拿旧副本解锁
  const cached = await readConvenience(meta.vaultId);
  const rc = ($('#recovery') ? $('#recovery').value : '').trim();
  const useCached = !rc && !!cached;
  if (!useCached && !rc){ toast('请输入恢复码'); return; }
  const btn = $('#unlock-form button[type=submit]');
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = '解密中…';
  try {
    let r;
    try {
      r = await VaultCore.unlockVault(STORE, {
        masterPassword: pw, deviceId: getDeviceId(),
        ...(useCached ? { secretKey: cached } : { recoveryCode: rc }),
      });
    } catch (e1) {
      // 便利副本校验失败且用户手输了恢复码 → 用恢复码再试一次（覆盖损坏/错配的旧副本）
      if (useCached && rc) {
        r = await VaultCore.unlockVault(STORE, {
          masterPassword: pw, deviceId: getDeviceId(), recoveryCode: rc,
        });
      } else {
        throw e1;
      }
    }
    VAULT = { dek: r.dek, secretKey: r.secretKey, deviceId: getDeviceId(), vaultId: meta.vaultId };
    // 无论走副本还是手输，只要解锁成功就重建便利副本（FR-K4 / §5 第 13 条），
    // 用正确副本覆盖掉可能错配/损坏的旧副本，避免下次又被卡死
    try {
      await VaultCore.saveSecretKey(meta.vaultId, r.secretKey);
    } catch (e) {
      const msg = '便利副本保存失败：' + (e.message || '未知错误') + '（下次仍需手输恢复码）';
      toast(msg);
      const h = $('#cv-hint'); if (h) h.textContent = msg;
    }
    ENTRIES = await VaultCore.loadEntries(STORE, VAULT);
    const target = PENDING_VIEW || 'vault';
    PENDING_VIEW = null;
    setView(target);
    if (target === 'vault'){
      const v = $('#view-vault');
      v.classList.add('enter');
      setTimeout(()=>v.classList.remove('enter'), 600);
    }
    renderAll();
    await refreshVaultUI();
    toast('已解锁 · ' + ENTRIES.length + ' 条');
  } catch (e) {
    // 开发原型：把真实错误码打到 console，便于定位（E_UNLOCK=密码/恢复码错，E_INTEGRITY_FAIL=哈希链损坏）
    const code = (e && e.message) || 'E_UNKNOWN';
    console.error('[vault] unlock failed:', code, e);
    // 诊断文案：区分「便利副本错配」「数据完整性损坏」「密码/恢复码错」，不再笼统说「数据损坏」
    let msg;
    if (code === 'E_INTEGRITY_FAIL') {
      msg = '数据完整性校验失败：记录哈希链不匹配，可能数据已损坏或来源不符';
    } else if (useCached && !rc) {
      msg = '本机便利副本校验失败，请在下方手动输入 26 位恢复码后重试';
    } else {
      msg = '无法解锁：主密码错误，或恢复码不匹配，或数据已损坏';
    }
    toast(msg);
    // 副本失败 / 完整性失败时展开恢复码框，避免被锁死
    if (useCached || code === 'E_INTEGRITY_FAIL') {
      const row = $('#recovery-row'); if (row) row.style.display = '';
      const alt = $('#recovery-alt'); if (alt) alt.style.display = 'none';
      const h = $('#lock-convenience-hint');
      if (h) h.textContent = (code === 'E_INTEGRITY_FAIL')
        ? '数据完整性校验失败，建议重新从备份恢复'
        : '便利副本校验失败，请在下方输入 26 位恢复码后重试';
    }
  } finally {
    btn.disabled = false; btn.textContent = orig;
    // FR-U5 / ③ §1.4：无论成功失败，输入框里的明文凭据都不留
    if ($('#recovery')) $('#recovery').value = '';
    if ($('#master')) $('#master').value = '';
  }
}

/* ── 统计 ── */
function countByType(){
  const live = ENTRIES.filter(e => !e.deleted);
  const c = { all: live.length };
  typeOrderKeys().forEach(k => c[k] = 0);
  live.forEach(e => { c[e.type] = (c[e.type] || 0) + 1; });
  return c;
}

function tagCount(name){
  return ENTRIES.filter(e => (e.tags || []).includes(name)).length;
}

/* ── 左栏 ── */
function renderRail(){
  const c = countByType();
  const favCount = ENTRIES.filter(e => e.fav && !e.deleted).length;
  // 「全部」固定首位、不参与排序；★ 收藏与类型项共用 railOrder() 顺序
  const dragAttr = isMobile() ? '' : ' draggable="true"';
  const favHtml = `<button class="cat ${state.fav ? 'active' : ''}" data-fav="1" data-type-key="${RAIL_FAV}"${dragAttr}>
      <span>★ 收藏</span><span class="count">${favCount}</span></button>`;
  const typeHtml = k => {
    const t = TYPES.find(x => x.key === k);
    if (!t) return '';
    return `<button class="cat ${state.cat === t.key && !state.tag && !state.fav ? 'active' : ''}" data-cat="${t.key}" data-type-key="${esc(t.key)}"${dragAttr}>
        <span>${esc(t.label)}</span><span class="count">${c[t.key] || 0}</span>
      </button>`;
  };
  $('#type-list').innerHTML =
    `<button class="cat ${state.cat === 'all' && !state.tag && !state.fav ? 'active' : ''}" data-cat="all">
       <span>全部</span><span class="count">${c.all}</span></button>`
    + railOrder().map(k => (k === RAIL_FAV ? favHtml : typeHtml(k))).join('');

  const trashCount = ENTRIES.filter(e => e.deleted).length;
  const tc = $('#trash-count');
  if (tc) tc.textContent = trashCount;

  $('#tag-list').innerHTML = TAGS.map(t => `
    <button class="cat ${state.tag === t ? 'active' : ''}" data-tag="${esc(t)}"${isMobile() ? '' : ' draggable="true"'}>
      <span>${esc(t)}</span><span class="count">${tagCount(t)}</span>
    </button>`).join('');

  $$('.cat[data-cat="trash"]').forEach(b => b.classList.toggle('active', state.cat === 'trash'));

  renderMobileNav();
}

/* ── 列表 ── */
function filtered(){
  return ENTRIES.filter(e => {
    if (e.deleted) return false;
    if (state.fav && !e.fav) return false;
    if (state.cat !== 'all' && e.type !== state.cat) return false;
    if (state.tag && !(e.tags || []).includes(state.tag)) return false;
    if (state.q){
      const q = state.q.toLowerCase();
      const hay = [e.title, e.user, e.url, ...(e.tags || [])].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

const typeOrder = () => typeOrderKeys();

function parseUpdated(s){
  if (!s) return 0;
  if (s === '刚刚') return Date.now();
  const m = /^(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(s);
  if (!m) return 0;
  return new Date(new Date().getFullYear(), +m[1] - 1, +m[2], +m[3], +m[4]).getTime();
}

function sortEntries(list){
  const byTime = (a, b) => parseUpdated(b.updated) - parseUpdated(a.updated);
  const copy = [...list];
  /* 收藏始终置顶；收藏内部按当前排序规则（含手动顺序） */
  const pinFav = arr => [...arr.filter(e => e.fav), ...arr.filter(e => !e.fav)];
  if (state.sort === 'title'){
    return pinFav(copy.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN', { numeric: true })));
  }
  if (state.sort === 'type'){
    const order = typeOrder();
    return pinFav(copy.sort((a, b) => {
      const d = order.indexOf(a.type) - order.indexOf(b.type);
      return d !== 0 ? d : byTime(a, b);
    }));
  }
  if (state.sort === 'manual'){
    const ids = state.order && state.order.length ? state.order : ENTRIES.map(e => e.id);
    const rank = id => { const i = ids.indexOf(id); return i < 0 ? 1e9 : i; };
    return pinFav(copy.sort((a, b) => rank(a.id) - rank(b.id)));
  }
  return pinFav(copy.sort(byTime));
}

function setSort(mode){
  state.sort = mode;
  try { localStorage.setItem('vault.sort', mode); } catch (e) {}
  const label = { time: '时间', title: '标题', type: '分类', manual: '手动' }[mode] || '时间';
  /* 手机端只显「排序」，后缀由 CSS 隐藏（≤720px .sort-sfx display:none） */
  const sortBtn = $('#btn-sort');
  sortBtn.textContent = '排序';
  const sfx = document.createElement('span');
  sfx.className = 'sort-sfx';
  sfx.textContent = ' · ' + label;
  sortBtn.appendChild(sfx);
  sortBtn.setAttribute('aria-label', '排序 · ' + label);
  $$('#sort-menu button').forEach(b => b.classList.toggle('on', b.dataset.sort === mode));
  closeSortMenu();
  renderList();
}

function closeSortMenu(){
  $('#sort-menu').classList.remove('on');
  $('#btn-sort').setAttribute('aria-expanded', 'false');
}

let dragRowId = null;

function listTitle(){
  if (state.fav) return '★ 收藏';
  if (state.tag) return '#' + state.tag;
  if (state.cat === 'all') return '全部';
  if (state.cat === 'trash') return '已删除';
  return typeLabel(state.cat);
}

function reorderEntries(fromId, toId){
  let ids;
  if (state.sort === 'manual' && state.order && state.order.length){
    ids = [...state.order];
  } else {
    /* 从别的排序切过来时，以「你现在看到的顺序」为基线，其余条目接在后面 */
    ids = sortEntries(filtered()).map(e => e.id);
  }
  ENTRIES.forEach(e => { if (!ids.includes(e.id)) ids.push(e.id); });
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0) return;
  const favOf = id => { const e = ENTRIES.find(x => x.id === id); return !!(e && e.fav); };
  const crossed = favOf(fromId) !== favOf(toId);
  const moved = ids.splice(from, 1)[0];
  ids.splice(to, 0, moved);
  state.order = ids;
  try { localStorage.setItem('vault.order', JSON.stringify(ids)); } catch (err) {}
  const wasManual = state.sort === 'manual';
  setSort('manual');
  renderRail();
  renderDetail();
  if (crossed){
    toast('收藏条目始终置顶', '它落在非收藏区里对应手的位置');
  } else if (!wasManual){
    toast('已切换为手动排序', '继续拖动可调整顺序');
  }
}

function renderList(){
  renderMobileNav();
  if (state.cat === 'trash'){
    const gone = ENTRIES.filter(e => e.deleted);
    $('#list-title').textContent = '已删除';
    $('#list-count').textContent = gone.length;
    $('#list-body').innerHTML = gone.length
      ? gone.map(e => `
        <div class="row ${e.id === state.selected ? 'active' : ''}" data-id="${e.id}">
          <div class="mark">${markChar(e)}</div>
          <div class="row-main">
            <div class="row-title">${esc(e.title)}</div>
            <div class="row-sub">${esc(typeLabel(e.type))} · 删除于 ${esc(e.deletedAt || '—')}</div>
          </div>
          <div class="row-right"><span class="row-time">${esc((e.updated || '').slice(0,5))}</span></div>
        </div>`).join('')
      : `<div class="detail-empty" style="height:200px">
          <div><div class="empty-title">回收站是空的</div>
          <div class="empty-sub">删除的条目先来这里，可以恢复</div></div></div>`;
    $$('#list-body .row').forEach(r => r.addEventListener('click', () => {
      state.selected = r.dataset.id;
      renderList(); renderDetail();
      if (isMobile()) setPane('detail');
    }));
    return;
  }

  const list = sortEntries(filtered());
  $('#list-title').textContent = listTitle();
  $('#list-count').textContent = list.length;
  $('#sb-count').textContent = `XChaCha20-Poly1305 · ${ENTRIES.length} 条`;

  $('#list-body').innerHTML = list.map(e => `
    <div class="row ${e.id === state.selected ? 'active' : ''}" data-id="${e.id}"${isMobile() ? '' : ' draggable="true"'}>
      <div class="mark">${markChar(e)}</div>
      <div class="row-main">
        <div class="row-title">${esc(e.title)}</div>
        <div class="row-sub">${esc(subline(e))}</div>
      </div>
      <div class="row-right">
        ${e.fav ? '<span class="row-star">★</span>' : ''}<span class="row-time">${e.updated.slice(0,5)}</span>
      </div>
    </div>`).join('') ||
    `<div class="detail-empty" style="height:200px">
       <div><div class="empty-title">无匹配</div><div class="empty-sub">换个词试试</div></div>
     </div>`;

  $$('#list-body .row').forEach(r => {
    r.addEventListener('click', () => {
      state.selected = r.dataset.id;
      renderList(); renderDetail();
      if (isMobile()) setPane('detail');
    });

    /* 拖到另一条上 = 手动排序；拖到左栏标签上 = 加标签 */
    r.addEventListener('dragstart', ev => {
      dragRowId = r.dataset.id;
      dragCat = null;   // 确保「拖条目」不会走侧边栏重排分支
      ev.dataTransfer.setData('text/plain', r.dataset.id);
      ev.dataTransfer.effectAllowed = 'copyMove';
      r.classList.add('dragging');
    });
    r.addEventListener('dragend', () => {
      dragRowId = null;
      $$('#list-body .row').forEach(x => x.classList.remove('dragging', 'drop-target'));
    });
    r.addEventListener('dragover', ev => {
      if (dragRowId == null) return;
      ev.preventDefault();
      $$('#list-body .row').forEach(x => x.classList.remove('drop-target'));
      if (r.dataset.id !== dragRowId) r.classList.add('drop-target');
    });
    r.addEventListener('drop', ev => {
      if (dragRowId == null) return;
      ev.preventDefault();
      const fromId = dragRowId;
      const toId = r.dataset.id;
      dragRowId = null;
      $$('#list-body .row').forEach(x => x.classList.remove('drop-target', 'dragging'));
      if (fromId !== toId) reorderEntries(fromId, toId);
    });
  });
}

function subline(e){
  if (e.loginMethod === 'oauth' && e.idp){
    const idp = ENTRIES.find(x => x.id === e.idp);
    return '通过 ' + (idp ? idp.title : '未知账户') + ' 登录';
  }
  return e.user || e.notes || typeLabel(e.type);
}

/* ── 详情 ── */
function renderDetail(){
  const e = ENTRIES.find(x => x.id === state.selected);
  const box = $('#detail');
  if (!e){
    box.innerHTML = `<div class="detail-empty"><div>
      <div class="empty-title">选一条记录</div><div class="empty-sub">或按 ⌘K 搜索</div></div></div>`;
    return;
  }

  box.innerHTML = `
    <div class="detail-head">
      <div class="mark-lg">${markChar(e)}</div>
      <div class="detail-title">
        <h1>${e.title}</h1>
        ${e.url
          ? `<a class="detail-url" href="https://${e.url}" target="_blank" rel="noreferrer">${e.url}</a>`
          : `<span class="detail-url">${typeLabel(e.type)}</span>`}
      </div>
      <div class="detail-actions">
        <button class="icon-btn star ${e.fav ? 'on' : ''}" data-fav="1"
          title="${e.fav ? '取消收藏' : '收藏 · 置顶'}" aria-label="收藏">${e.fav ? '★' : '☆'}</button>
        ${e.deleted
          ? `<button class="btn ghost sm" data-restore="1">恢复</button>
             <button class="btn danger sm" data-purge="1">彻底删除</button>`
          : `<button class="btn ghost sm" data-edit="1">编辑</button>
             <button class="btn danger sm" data-delete="1">删除</button>`}
      </div>
    </div>

    <div class="detail-body">
      ${e.deleted ? `<div class="trash-banner">此条目在回收站 · 删除于 ${esc(e.deletedAt || '刚刚')}。恢复后回到列表，彻底删除后无法还原。</div>` : ''}
      ${methodHtml(e)}
      ${strengthHtml(e)}
      ${reverseHtml(e)}

      ${e.fields.map((f, i) => ({ f, i })).filter(o => !(o.f.k === '网址' && e.url)).map(({ f, i }) => `
        <section class="field-group">
          <div class="field-label">${f.k}</div>
          <div class="field-row">
            <span class="field-val ${f.secret ? 'secret' : ''}" data-f="${i}"
              style="${f.secret && !state.secretVisible[e.id + '-' + i] ? '-webkit-text-security:disc' : ''}">${f.v.replace(/\n/g,'<br>')}</span>
            ${f.secret ? `<button class="icon-btn" data-reveal="${i}" aria-label="按住显示">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>
            </button>` : ''}
            <button class="icon-btn" data-copyfield="${i}" aria-label="复制">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15"/></svg>
            </button>
          </div>
          ${f.hint ? `<div class="field-hint">${f.hint}</div>` : ''}

        </section>`).join('')}

      ${e.notes ? `
        <section class="field-group">
          <div class="field-label">备注</div>
          <div class="notes-val">${e.notes}</div>
        </section>` : ''}

      <section class="field-group">
        <div class="field-label">标签</div>
        <div class="tag-row">
          ${e.tags.map(t => `<span class="tag-pill removable">${t}<button class="x" data-untag="${t}" aria-label="移除">×</button></span>`).join('')}
          <button class="tag-add" data-tagpick="1">＋ 添加</button>
        </div>
      </section>

      <div class="detail-meta">
        <span>更新 <b>${e.updated}</b></span>
        <span>类型 <b>${typeLabel(e.type)}</b></span>
        <span>密钥 <b>XChaCha20-Poly1305</b></span>
      </div>

      <div class="hist">
        <div class="hist-label">历史</div>
        ${e.hist.map(h => `<div class="hist-item"><b>${h[0]}</b><span>${h[1]}</span></div>`).join('')}
      </div>
    </div>`;

  bindDetail(e);
}

function methodHtml(e){
  if (e.type !== 'login' || !e.loginMethod) return '';
  if (e.loginMethod === 'oauth' && e.idp){
    const idp = ENTRIES.find(x => x.id === e.idp);
    return `
      <section class="field-group">
        <div class="field-label">登录方式</div>
        <div class="method-row">
          <span class="method-badge"><span class="dot"></span>通过
            <button class="link-inline" data-goto="${e.idp}">${idp ? idp.title : '未知账户'}</button>登录</span>
        </div>
        <div class="field-hint">本站没有独立密码，凭据由该账户托管</div>
      </section>`;
  }
  return `
    <section class="field-group">
      <div class="field-label">登录方式</div>
      <div class="method-row">
        <span class="method-badge"><span class="dot"></span>${METHOD_META[e.loginMethod] || e.loginMethod}</span>
      </div>
    </section>`;
}

function strengthHtml(e){
  if (!e.strength) return '';
  const label = e.strength >= 4 ? '强' : e.strength === 3 ? '中' : '弱';
  return `
    <section class="field-group">
      <div class="field-label">密码强度</div>
      <div class="strength-row">
        <div class="meter">${[1,2,3,4].map(i =>
          `<i class="${i <= e.strength ? (e.strength <= 1 ? 'low' : e.strength === 2 ? 'mid' : 'on') : ''}"></i>`).join('')}</div>
        <span class="strength-label mono">${label}</span>
      </div>
      <div class="field-hint">按字符集与常见模式评估，不只看长度（FR-G2）</div>
    </section>`;
}

function reverseHtml(e){
  if (e.type !== 'account') return '';
  const sites = ENTRIES.filter(x => x.idp === e.id);
  return `
    <section class="field-group">
      <div class="field-label">由此账户登录的站点 · ${sites.length}</div>
      ${sites.length
        ? `<div class="ref-list">${sites.map(s => `
            <button class="ref-item" data-goto="${s.id}">
              <span class="mark">${markChar(s)}</span>
              <span>${s.title}</span>
              <span class="ref-tag">${s.tags[0] || ''}</span>
            </button>`).join('')}</div>`
        : `<div class="field-hint">暂无站点使用此账户</div>`}
      <div class="field-hint">此账户的密码变更会影响以上全部站点</div>
    </section>`;
}

function bindDetail(e){
  $$('[data-reveal]').forEach(btn => {
    const idx = btn.dataset.reveal;
    const val = btn.closest('.field-row').querySelector('.field-val');
    let hideTimer = null;
    const mask = () => {
      if (!state.secretVisible[e.id + '-' + idx]) val.style.setProperty('-webkit-text-security', 'disc');
    };
    const show = () => {
      clearTimeout(hideTimer);
      val.style.removeProperty('-webkit-text-security');
      hideTimer = setTimeout(mask, 8000);   /* 触屏没有 hover：8 秒后自动重新遮挡 */
    };
    const hide = () => { clearTimeout(hideTimer); mask(); };
    btn.addEventListener('pointerdown', ev => { ev.preventDefault(); show(); });
    btn.addEventListener('pointerup', hide);
    btn.addEventListener('pointercancel', hide);
    btn.addEventListener('pointerleave', hide);
    btn.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); show(); }
    });
  });

  $$('[data-copyfield]').forEach(btn => btn.addEventListener('click', () => {
    const f = ENTRIES.find(x => x.id === state.selected).fields[btn.dataset.copyfield];
    copy(f.v, f.k);
  }));
  /* 注意：必须圈定在详情面板内，否则会命中左栏的收藏筛选按钮（同 data-fav） */
  $$('.detail-actions [data-edit]').forEach(btn => btn.addEventListener('click', () => openModal(e.id)));
  $$('.detail-actions [data-fav]').forEach(btn => btn.addEventListener('click', () => toggleFav(e.id)));
  $$('.detail-actions [data-delete]').forEach(btn => btn.addEventListener('click', () => askDelete(e.id)));
  $$('.detail-actions [data-restore]').forEach(btn => btn.addEventListener('click', () => restoreEntry(e.id)));
  $$('.detail-actions [data-purge]').forEach(btn => btn.addEventListener('click', () => askPurge(e.id)));

  $$('[data-goto]').forEach(btn => btn.addEventListener('click', () => {
    state.selected = btn.dataset.goto;
    renderList(); renderDetail();
  }));

  $$('[data-untag]').forEach(btn => btn.addEventListener('click', () => {
    const entry = ENTRIES.find(x => x.id === state.selected);
    entry.tags = entry.tags.filter(t => t !== btn.dataset.untag);
    renderAll();
    toast('已移除标签', btn.dataset.untag);
  }));

  $$('[data-tagpick]').forEach(btn => btn.addEventListener('click', () => openTagPick(e.id)));
  renderDetailActs();
}

function copy(text, label){
  navigator.clipboard?.writeText(text).catch(()=>{});
  toast('已复制', label);
}

/* ── 收藏（FR-E6） ── */
function toggleFav(id){
  const e = ENTRIES.find(x => x.id === id);
  if (!e) return;
  e.fav = !e.fav;
  renderAll();
  toast(e.fav ? '已收藏 · 列表里置顶' : '已取消收藏');
}

/* ── 确认弹层：破坏性操作先说后果 ── */
function openConfirm(opt){
  state.confirmCb = opt.onOk || null;
  $('#confirm-title').textContent = opt.title || '确认';
  $('#confirm-body').textContent = opt.body || '';
  $('#confirm-ok').textContent = opt.okText || '确认';
  $('#confirm-ok').classList.toggle('danger', !!opt.danger);
  $('#confirm-scrim').classList.add('on');
  $('#confirm').classList.add('on');
}

function closeConfirm(){
  state.confirmCb = null;
  $('#confirm-scrim').classList.remove('on');
  $('#confirm').classList.remove('on');
}

/* ── 回收站（FR-E4）：删除不真删，彻底删除才消失 ── */
function askDelete(id){
  const e = ENTRIES.find(x => x.id === id);
  if (!e) return;
  openConfirm({
    title: '移入回收站？',
    body: '「' + e.title + '」会进入回收站，随时可以恢复。恢复前它不会出现在列表和搜索结果里。',
    okText: '移入回收站',
    onOk: () => trashEntry(id),
  });
}

async function trashEntry(id){
  const e = ENTRIES.find(x => x.id === id);
  if (!e) return;
  e.deleted = true;
  e.deletedAt = '刚刚';
  e.hist.unshift(['刚刚', '移入回收站']);
  if (state.order) state.order = state.order.filter(x => x !== id);
  if (state.selected === id){
    const next = sortEntries(filtered())[0];
    state.selected = next ? next.id : null;
  }
  if (VAULT) await VaultCore.deleteRecord(STORE, VAULT, { id });
  renderAll();
  toast('已移入回收站', '可恢复');
}

async function restoreEntry(id){
  const e = ENTRIES.find(x => x.id === id);
  if (!e) return;
  e.deleted = false;
  delete e.deletedAt;
  e.hist.unshift(['刚刚', '恢复']);
  if (state.order) state.order.unshift(id);
  state.selected = id;
  state.cat = 'all';
  state.fav = false;
  if (VAULT) await VaultCore.updateRecord(STORE, VAULT, { id, plaintext: e });
  renderAll();
  toast('已恢复', e.title);
}

function askPurge(id){
  const e = ENTRIES.find(x => x.id === id);
  if (!e) return;
  openConfirm({
    title: '彻底删除？',
    body: '此操作不可撤销，且没有服务端可以恢复。「' + e.title + '」的字段、标签与历史会一起消失。',
    okText: '彻底删除',
    danger: true,
    onOk: () => purgeEntry(id),
  });
}

async function purgeEntry(id){
  const i = ENTRIES.findIndex(x => x.id === id);
  if (i < 0) return;
  if (VAULT) await VaultCore.deleteRecord(STORE, VAULT, { id });
  ENTRIES.splice(i, 1);
  if (state.order) state.order = state.order.filter(x => x !== id);
  if (state.selected === id){
    const next = ENTRIES.filter(e => e.deleted)[0];
    state.selected = next ? next.id : null;
  }
  renderAll();
  toast('已彻底删除（分片物理擦除待 M4）', '不可恢复');
}

/* ── 标签：加/减 ── */
function addTagToEntry(entryId, tag){
  const entry = ENTRIES.find(x => x.id === entryId);
  if (!entry) return;
  if (entry.tags.includes(tag)){ toast('已在该标签内', tag); return; }
  entry.tags.push(tag);
  renderAll();
  toast('已加入标签', tag);
}

/* ── 弹层：新建 / 重命名标签 ── */
function openTagModal(mode, preset){
  state.tagMode = mode;
  state.renaming = mode === 'rename' ? preset : null;
  $('#tagmodal-title').textContent = mode === 'rename' ? '重命名标签' : '新建标签';
  $('#tag-name').value = mode === 'rename' ? preset : '';
  $('#tag-hint').textContent = '';
  $('#tagmodal-scrim').classList.add('on');
  $('#tagmodal').classList.add('on');
  setTimeout(() => $('#tag-name').focus(), 100);
}
function closeTagModal(){
  $('#tagmodal-scrim').classList.remove('on');
  $('#tagmodal').classList.remove('on');
}
function saveTag(){
  const name = $('#tag-name').value.trim();
  if (!name){ $('#tag-hint').textContent = '名称不能为空'; return; }
  if (state.tagMode === 'rename'){
    if (name === state.renaming){ closeTagModal(); return; }
    if (TAGS.includes(name)){ $('#tag-hint').textContent = '已存在同名标签'; return; }
    ENTRIES.forEach(e => {
      e.tags = e.tags.map(t => t === state.renaming ? name : t);
    });
    TAGS = TAGS.map(t => t === state.renaming ? name : t);
    if (state.tag === state.renaming) state.tag = name;
    toast('已重命名', name);
  } else {
    if (TAGS.includes(name)){ $('#tag-hint').textContent = '已存在同名标签'; return; }
    TAGS.push(name);
    toast('已创建标签', name);
  }
  saveRegistry();
  closeTagModal();
  renderAll();
}

/* ── 弹层：管理标签 ── */
function openTagManage(){
  $('#tagmanage-body').innerHTML = TAGS.map(t => `
    <div class="manage-row">
      <span class="name">${t}</span>
      <span class="count">${tagCount(t)}</span>
      <div class="acts">
        <button class="mini" data-rename="${t}">重命名</button>
        <button class="mini danger" data-del="${t}">删除</button>
      </div>
    </div>`).join('') || `<div class="picker-empty">还没有标签</div>`;

  $$('[data-rename]').forEach(b => b.addEventListener('click', () => {
    closeTagManage();
    openTagModal('rename', b.dataset.rename);
  }));
  $$('[data-del]').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.del;
    const n = tagCount(t);
    if (!confirm(`删除标签「${t}」？\n${n} 条记录会失去这个标签，记录本身不会被删除。`)) return;
    TAGS = TAGS.filter(x => x !== t);
    saveRegistry();
    ENTRIES.forEach(e => { e.tags = e.tags.filter(x => x !== t); });
    if (state.tag === t) state.tag = null;
    openTagManage();
    renderAll();
    toast('已删除标签', t);
  }));

  $('#tagmanage-scrim').classList.add('on');
  $('#tagmanage').classList.add('on');
}
function closeTagManage(){
  $('#tagmanage-scrim').classList.remove('on');
  $('#tagmanage').classList.remove('on');
}

/* ── 弹层：为条目选标签 ── */
function openTagPick(entryId){
  state.tagTarget = entryId;
  const entry = ENTRIES.find(x => x.id === entryId);
  $('#tagpick-body').innerHTML = `
    <div class="picker">
      ${TAGS.map(t => `
        <label class="picker-item">
          <input type="checkbox" data-toggle="${t}" ${entry.tags.includes(t) ? 'checked' : ''}>
          <span>${t}</span><span class="count">${tagCount(t)}</span>
        </label>`).join('') || `<div class="picker-empty">还没有标签，先新建一个</div>`}
    </div>`;
  $$('[data-toggle]').forEach(cb => cb.addEventListener('change', () => {
    const entry2 = ENTRIES.find(x => x.id === state.tagTarget);
    const t = cb.dataset.toggle;
    if (cb.checked){ if (!entry2.tags.includes(t)) entry2.tags.push(t); }
    else entry2.tags = entry2.tags.filter(x => x !== t);
    renderAll();
  }));
  $('#tagpick-new').value = '';
  $('#tagpick-scrim').classList.add('on');
  $('#tagpick').classList.add('on');
}
function closeTagPick(){
  $('#tagpick-scrim').classList.remove('on');
  $('#tagpick').classList.remove('on');
}

/* ── 条目编辑器：新建与编辑共用同一套字段（FR-E2 / FR-E8 / FR-E9 / FR-E10） ── */

const isPassField = f => /^(密码|口令)/.test(String(f.k || '').trim());

function scorePass(p){
  if (!p) return 0;
  let c = 0;
  if (/[a-z]/.test(p)) c++;
  if (/[A-Z]/.test(p)) c++;
  if (/[0-9]/.test(p)) c++;
  if (/[^A-Za-z0-9]/.test(p)) c++;
  if (p.length >= 14 && c >= 3) return 4;
  if (p.length >= 12 && c >= 2) return 3;
  if (p.length >= 8) return 2;
  return 1;
}

function passHint(p){
  const s = scorePass(p);
  return p.length + ' 个字符 · ' + (s >= 4 ? '强' : s === 3 ? '中' : s === 2 ? '弱' : '很弱');
}

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openModal(editId){
  const entry = editId ? ENTRIES.find(x => x.id === editId) : null;
  state.editing = entry ? entry.id : null;
  state.draft = entry
    ? { type: entry.type,
        loginMethod: entry.loginMethod || (entry.type === 'login' ? 'password' : null),
        idp: entry.idp || null,
        fields: entry.fields.map(f => ({ ...f })),
        tags: [...entry.tags] }
    : { type: 'login', loginMethod: 'password', idp: null,
        fields: fieldsFor('login', 'password'), tags: [] };

  $('#modal-title').textContent = entry ? '编辑条目' : '新建条目';
  $('#modal-save').textContent  = entry ? '保存修改' : '保存并加密';
  $('#new-title').value = entry ? entry.title : '';
  $('#new-url').value   = entry ? (entry.url || '') : '';
  $('#new-notes').value = entry ? (entry.notes || '') : '';
  $('#modal-hint').textContent = '';
  renderModalEditor();
  $('#modal-scrim').classList.add('on');
  $('#modal').classList.add('on');
  setTimeout(() => $('#new-title').focus(), 120);
}

function renderModalEditor(){
  const d = state.draft;
  $('#type-seg').innerHTML = TYPES.map(t =>
    `<button type="button" data-type="${t.key}" class="${d.type === t.key ? 'on' : ''}">${esc(t.label)}${t.builtin ? '' : ' · 自定义'}</button>`).join('');

  const isLogin = d.type === 'login';
  $('#method-field').style.display = isLogin ? '' : 'none';
  if (isLogin){
    $('#method-seg').innerHTML = Object.keys(METHOD_META).map(k =>
      `<button type="button" data-method="${k}" class="${d.loginMethod === k ? 'on' : ''}">${METHOD_META[k]}</button>`).join('');
  } else {
    $('#method-seg').innerHTML = '';
  }
  renderIdpPick();
  renderFieldRows();
  renderModalTags();
  updateEditorHint();
}

function renderIdpPick(){
  const d = state.draft;
  const box = $('#idp-pick');
  if (d.type !== 'login' || d.loginMethod !== 'oauth'){ box.innerHTML = ''; return; }
  const idps = ENTRIES.filter(x => x.type === 'account');
  box.innerHTML = idps.length
    ? `<label class="field-label">引用身份账户 · 决定反向索引（FR-E10）</label>
       <select id="new-idp">${idps.map(x =>
         `<option value="${x.id}" ${d.idp === x.id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select>`
    : `<div class="none">还没有「身份账户」条目。先建一条，再回来引用它。</div>`;
}

const fieldBox = scope => document.getElementById(
  scope === 'tpl' ? 'tpl-field-list' : scope === 'newtype' ? 'type-field-list' : 'field-list');
const draftBox = scope => (scope === 'tpl' ? state.tplDraft
  : scope === 'newtype' ? state.typeDraft : state.draft);

function fieldRowHtml(f, i, scope){
  const flag = (key, on, label, title) =>
    `<button type="button" class="fi-toggle ${on ? 'on' : ''}" data-${key}="${i}" title="${title}">${label}</button>`;
  const moves = `<button type="button" class="fi-move" data-up="${i}" aria-label="上移">↑</button>
      <button type="button" class="fi-move" data-down="${i}" aria-label="下移">↓</button>
      <button type="button" class="fi-del" data-delf="${i}" aria-label="删除该字段">×</button>`;

  if (scope === 'tpl' || scope === 'newtype'){
    return `
      <div class="field-item" data-row="${i}">
        <span class="fi-grip" title="拖动排序">⋮⋮</span>
        <input class="input k" value="${esc(f.k)}" placeholder="名称" data-k="${i}">
        ${flag('secret', f.secret, f.secret ? '敏感' : '普通', '敏感字段：详情默认遮挡')}
        ${flag('multi', f.multiline, f.multiline ? '多行' : '单行', '多行值：适合备注类内容')}
        ${moves}
      </div>`;
  }

  return `
    <div class="field-item" data-row="${i}">
      <span class="fi-grip" title="拖动排序">⋮⋮</span>
      <button type="button" class="fi-del-l" data-delf="${i}" aria-label="删除该字段">&times;</button>
      <input class="input k" value="${esc(f.k)}" placeholder="名称" data-k="${i}">
      ${f.multiline
        ? `<textarea class="input v mono" data-v="${i}" rows="2">${esc(f.v)}</textarea>`
        : `<input class="input v mono" value="${esc(f.v)}" placeholder="值" data-v="${i}">`}
      ${flag('secret', f.secret, f.secret ? '敏感' : '普通', '敏感字段：默认遮挡，按住显示')}
      ${moves}
    </div>`;
}

function renderFieldRows(scope){
  const s = scope || 'entry';
  const box = fieldBox(s);
  const d = draftBox(s);
  if (!box || !d) return;
  box.innerHTML = d.fields.map((f, i) => fieldRowHtml(f, i, s)).join('')
    || `<div class="none">还没有字段。点「＋ 添加字段」。</div>`;
}

function renderModalTags(){
  const d = state.draft;
  $('#modal-tags').innerHTML =
    TAGS.map(t => `<button type="button" class="chip ${d.tags.includes(t) ? 'on' : ''}" data-mtag="${esc(t)}">${esc(t)}</button>`).join('')
    + `<input class="chip-new" id="modal-tag-new" placeholder="＋ 新标签" autocomplete="off">`;
}

function syncFieldsFromDom(scope){
  const s = scope || 'entry';
  const d = draftBox(s);
  const box = fieldBox(s);
  if (!d || !box) return;
  [...box.querySelectorAll('.field-item')].forEach(row => {
    const i = Number(row.dataset.row);
    if (!d.fields[i]) return;
    const kEl = row.querySelector('[data-k]');
    const vEl = row.querySelector('[data-v]');
    if (kEl) d.fields[i].k = kEl.value;
    if (vEl) d.fields[i].v = vEl.value;
  });
}

function updateEditorHint(){
  const f = state.draft.fields.find(isPassField);
  $('#modal-hint').textContent = f && f.v ? '密码强度：' + passHint(f.v) : '';
}

function closeModal(){
  state.draft = null;
  state.editing = null;
  $('#modal-scrim').classList.remove('on');
  $('#modal').classList.remove('on');
}

/* ── 类型：新建 / 重命名 / 删除（与标签同一套交互） ── */
function openTypeModal(renameKey){
  const t = renameKey ? TYPES.find(x => x.key === renameKey) : null;
  state.typeRenaming = t ? t.key : null;
  $('#typemodal-title').textContent = t ? '重命名类型' : '新建类型';
  $('#type-name').value = t ? t.label : '';
  $('#type-template-field').style.display = t ? 'none' : '';
  $('#type-template').value = 'empty';
  state.typeDraft = t ? null : { fields: [] };
  if (!t) renderFieldRows('newtype');
  syncTypeTplVisibility();
  $('#type-hint').textContent = t
    ? '只改显示名，已有条目的类型归属不变'
    : '自定义类型可以和内置五类一样使用；模板只决定新建条目时的初始字段';
  $('#typemodal-scrim').classList.add('on');
  $('#typemodal').classList.add('on');
  setTimeout(() => $('#type-name').focus(), 80);
}

function closeTypeModal(){
  state.typeRenaming = null;
  state.typeDraft = null;
  $('#typemodal-scrim').classList.remove('on');
  $('#typemodal').classList.remove('on');
}

function saveType(){
  const name = $('#type-name').value.trim();
  if (!name){ $('#type-hint').textContent = '名称必填'; return; }
  if (TYPES.some(t => t.label === name && t.key !== state.typeRenaming)){
    $('#type-hint').textContent = '已有同名类型';
    return;
  }
  if (state.typeRenaming){
    const t = TYPES.find(x => x.key === state.typeRenaming);
    if (t) t.label = name;
    saveRegistry();
    closeTypeModal();
    renderAll();
    toast('类型已重命名', name);
    return;
  }
  const tpl = $('#type-template').value;
  let template;
  if (tpl === 'empty'){
    // 选「空」时用弹层里就地编辑的字段作为该类型模板（FR-E8）
    syncFieldsFromDom('newtype');
    template = (state.typeDraft ? state.typeDraft.fields : [])
      .map(f => ({ k: String(f.k || '').trim(), v: '', secret: !!f.secret, multiline: !!f.multiline }))
      .filter(f => f.k);
  } else {
    template =
      tpl === 'secret' ? [{ k:'密钥', v:'', secret:true }]
      : tpl === 'login' ? [{ k:'用户名', v:'' }, { k:'密码', v:'', secret:true }]
      : [{ k:'内容', v:'', secret:true, multiline:true }];
  }
  TYPES.push({ key:'t-' + Date.now().toString(36), label:name, builtin:false, template });
  saveRegistry();
  closeTypeModal();
  renderAll();
  toast('类型已新增', name);
}

function tplSummary(t){
  if (t.builtin){
    if (t.key === 'login') return '字段随登录方式：密码 / 第三方 / 验证码 / 通行密钥';
    const f = TYPE_FIELDS[t.key] || [];
    return f.length ? f.map(x => x.k + (x.secret ? '（敏感）' : '') + (x.multiline ? '（多行）' : '')).join(' · ') : '无预设字段';
  }
  const f = t.template || [];
  return f.length
    ? f.map(x => x.k + (x.secret ? '（敏感）' : '') + (x.multiline ? '（多行）' : '')).join(' · ')
    : '空模板 · 新建条目时自己加字段';
}

function openTypeManage(){
  $('#typemanage-body').innerHTML = TYPES.map(t => {
    const n = ENTRIES.filter(e => e.type === t.key && !e.deleted).length;
    return `<div class="manage-row">
      <div class="manage-main">
        <span class="name">${esc(t.label)}</span>
        <span class="tpl">${esc(tplSummary(t))}</span>
      </div>
      <span class="count">${n} 条${t.builtin ? ' · 内置' : ''}</span>
      <div class="acts">
        <button class="mini" data-renametype="${t.key}">重命名</button>
        ${t.builtin
          ? ''
          : `<button class="mini" data-edittpl="${t.key}">编辑字段</button>
        <button class="mini danger" data-deltype="${t.key}">删除</button>`}
      </div>
    </div>`;
  }).join('');
  $('#typemanage-scrim').classList.add('on');
  $('#typemanage').classList.add('on');
}

function closeTypeManage(){
  $('#typemanage-scrim').classList.remove('on');
  $('#typemanage').classList.remove('on');
}

function deleteType(key){
  const t = TYPES.find(x => x.key === key);
  if (!t) return;
  if (t.builtin){ toast('内置类型不可删除'); return; }
  const n = ENTRIES.filter(e => e.type === key).length;
  if (n > 0){ toast('该类型下还有 ' + n + ' 条条目', '先把它们改成别的类型'); return; }
  TYPES = TYPES.filter(x => x.key !== key);
  saveRegistry();
  if (state.cat === key) state.cat = 'all';
  openTypeManage();
  renderAll();
  toast('类型已删除', t.label);
}

/* ── 自定义类型的默认字段模板（可事后编辑） ── */
function openTplModal(key){
  const t = TYPES.find(x => x.key === key);
  if (!t) return;
  if (t.builtin){ toast('内置类型的字段结构固定', '登录类跟随登录方式'); return; }
  state.tplTarget = key;
  state.tplDraft = { type: t.key, fields: (t.template || []).map(f => ({ ...f })) };
  $('#tplmodal-title').textContent = '编辑字段模板 · ' + t.label;
  $('#tplmodal-hint').textContent = '只影响「新建该类型条目」时的初始字段；已有条目的字段不受影响。';
  renderFieldRows('tpl');
  $('#tplmodal-scrim').classList.add('on');
  $('#tplmodal').classList.add('on');
}

function closeTplModal(){
  state.tplDraft = null;
  state.tplTarget = null;
  $('#tplmodal-scrim').classList.remove('on');
  $('#tplmodal').classList.remove('on');
}

function saveTpl(){
  const t = TYPES.find(x => x.key === state.tplTarget);
  if (!t || !state.tplDraft) return;
  syncFieldsFromDom('tpl');
  t.template = state.tplDraft.fields
    .map(f => ({ ...f, k: String(f.k || '').trim() }))
    .filter(f => f.k);
  saveRegistry();
  closeTplModal();
  openTypeManage();
  renderAll();
  toast('模板已保存', t.label);
}

/* ── 渲染全部 ── */
function renderAll(){ renderRail(); renderList(); renderDetail(); }

/* ── 事件 ── */
$('#unlock-form').addEventListener('submit', e => { e.preventDefault(); unlock(); });

$('#master-eye').addEventListener('click', () => {
  const inp = $('#master');
  inp.type = inp.type === 'password' ? 'text' : 'password';
  inp.focus();
});

$('.rail').addEventListener('click', ev => {
  const cat = ev.target.closest('.cat[data-cat]');
  if (cat){
    state.cat = cat.dataset.cat;
    state.tag = null;
    state.fav = false;
    renderRail();
    renderList();
    return;
  }
  const fav = ev.target.closest('.cat[data-fav]');
  if (fav){
    state.fav = true;
    state.cat = 'all';
    state.tag = null;
    renderRail();
    renderList();
    return;
  }
  const tag = ev.target.closest('.cat[data-tag]');
  if (tag){
    state.tag = tag.dataset.tag;
    state.cat = 'all';
    state.fav = false;
    renderRail();
    renderList();
  }
});

/* ── 侧边栏拖拽排序（③ §3，仅桌面；与「拖条目到标签加标签」共存）── */
function clearRailMarks(){
  $$('#type-list .cat, #tag-list .cat').forEach(x => x.classList.remove('dragging', 'drop-target', 'dragover'));
}
function reorderRegistry(kind, from, to){
  if (kind === 'type'){
    const order = railOrder();          // 含「★ 收藏」伪 key，收藏项可与类型项互换位置
    const i = order.indexOf(from), j = order.indexOf(to);
    if (i < 0 || j < 0 || i === j) return;
    const [moved] = order.splice(i, 1);
    order.splice(j, 0, moved);
    RAIL_ORDER = order;
    syncTypesFromRail();                // 保持分类分组排序与侧边栏一致
    saveRegistry();
    renderAll();
    toast('侧边栏顺序已保存');
    return;
  }
  const arr = TAGS;
  const i = arr.indexOf(from), j = arr.indexOf(to);
  if (i < 0 || j < 0 || i === j) return;
  const [moved] = arr.splice(i, 1);
  arr.splice(j, 0, moved);
  saveRegistry();
  renderAll();
  toast('标签顺序已保存');
}
function railDragStart(ev, kind, value, el){
  dragCat = { kind, value };
  el.classList.add('dragging');
  if (ev.dataTransfer){
    ev.dataTransfer.effectAllowed = 'move';
    try { ev.dataTransfer.setData('text/plain', ''); } catch (e) {}
  }
}
$('#type-list').addEventListener('dragstart', ev => {
  const el = ev.target.closest('.cat[data-type-key]');
  if (el) railDragStart(ev, 'type', el.dataset.typeKey, el);
});
$('#type-list').addEventListener('dragover', ev => {
  const el = ev.target.closest('.cat[data-type-key]');
  if (!el || !dragCat || dragCat.kind !== 'type') return;
  ev.preventDefault();
  $$('#type-list .cat').forEach(x => x.classList.remove('drop-target'));
  if (el.dataset.typeKey !== dragCat.value) el.classList.add('drop-target');
});
$('#type-list').addEventListener('drop', ev => {
  const el = ev.target.closest('.cat[data-type-key]');
  if (!el || !dragCat || dragCat.kind !== 'type') return;
  ev.preventDefault();
  const from = dragCat.value, to = el.dataset.typeKey;
  dragCat = null; clearRailMarks();
  if (from !== to) reorderRegistry('type', from, to);
});
$('#tag-list').addEventListener('dragstart', ev => {
  const el = ev.target.closest('.cat[data-tag]');
  if (el) railDragStart(ev, 'tag', el.dataset.tag, el);
});
document.addEventListener('dragend', () => { dragCat = null; clearRailMarks(); });

$('#tag-list').addEventListener('dragover', ev => {
  const el = ev.target.closest('.cat[data-tag]');
  if (!el) return;
  ev.preventDefault();
  el.classList.add('dragover');
});
$('#tag-list').addEventListener('dragleave', ev => {
  const el = ev.target.closest('.cat[data-tag]');
  if (el) el.classList.remove('dragover');
});
$('#tag-list').addEventListener('drop', ev => {
  const el = ev.target.closest('.cat[data-tag]');
  if (!el) return;
  ev.preventDefault();
  el.classList.remove('dragover');
  if (dragCat){
    const { kind, value } = dragCat;
    dragCat = null; clearRailMarks();
    // 只有标签项能重排标签；类型项拖过来一律忽略，绝不误当成「拖条目加标签」
    if (kind === 'tag' && value !== el.dataset.tag) reorderRegistry('tag', value, el.dataset.tag);
    return;
  }
  const id = ev.dataTransfer.getData('text/plain');
  if (id) addTagToEntry(id, el.dataset.tag);
});

/* 类型：新建 / 管理 */
$('#btn-new-type').addEventListener('click', () => openTypeModal());
$('#btn-manage-type').addEventListener('click', openTypeManage);
$('#typemodal-close').addEventListener('click', closeTypeModal);
$('#typemodal-cancel').addEventListener('click', closeTypeModal);
$('#typemodal-scrim').addEventListener('click', closeTypeModal);
$('#typemodal-save').addEventListener('click', saveType);
$('#type-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveType(); });
$('#typemanage-close').addEventListener('click', closeTypeManage);
$('#typemanage-done').addEventListener('click', closeTypeManage);
$('#typemanage-scrim').addEventListener('click', closeTypeManage);
$('#typemanage-new').addEventListener('click', () => { closeTypeManage(); openTypeModal(); });
$('#typemanage-body').addEventListener('click', ev => {
  const r = ev.target.closest('[data-renametype]');
  if (r){ closeTypeManage(); openTypeModal(r.dataset.renametype); return; }
  const d = ev.target.closest('[data-deltype]');
  if (d){ deleteType(d.dataset.deltype); return; }
  const tp = ev.target.closest('[data-edittpl]');
  if (tp){ closeTypeManage(); openTplModal(tp.dataset.edittpl); }
});

$('#search').addEventListener('input', e => { state.q = e.target.value.trim(); renderList(); });

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){
    e.preventDefault();
    if (state.view === 'vault') $('#search').focus();
  }
  if (e.key === 'Escape'){ closeModal(); closeTagModal(); closeTagManage(); closeTagPick(); closeTypeModal(); closeTypeManage(); closeConfirm(); closeTplModal(); setRailOpen(false); }
});

/* 锁定：清遮挡态、回列表、回锁屏（FR-M8 / FR-U5 / ③ §1.4 / ADR-023） */
function lockVault(){
  if (VAULT) VaultCore.lock(VAULT);
  VAULT = null;
  // IndexedDB 里的便利副本按 ADR-023 保留；内存不持有任何 Secret Key（FR-U5）
  ENTRIES = [];
  state.secretVisible = {};
  // 锁定即清空输入框明文，绝不残留（否则等于没锁）
  const master = $('#master'); if (master) master.value = '';
  const recovery = $('#recovery'); if (recovery) recovery.value = '';
  setPane('list');
  setView('unlock');
  // 状态必须与真实副本一致，不能停留在解锁前的快照（规则 5）
  void refreshLockUI().catch(e => toast('锁定后状态刷新失败：' + (e.message || '未知错误')));
  setTimeout(() => {
    const m = $('#master');
    if (!m) return;
    m.value = '';   // 再清一次：防 focus 触发浏览器自动填充把主密码填回来
    m.focus();
  }, 50);
}

$('#btn-lock').addEventListener('click', lockVault);

/* 切后台即锁（③ §3.5 FR-M8）；剪贴板只能尽力清 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('').catch(() => {});
  } catch (err) {}
  if (state.view !== 'unlock') lockVault();
});
$('#btn-settings').addEventListener('click', () => { setView('settings'); void refreshVaultUI(); });
$('#btn-back').addEventListener('click', () => setView('vault'));
$('#btn-new').addEventListener('click', () => openModal());
$('#modal-close').addEventListener('click', closeModal);
$('#modal-cancel').addEventListener('click', closeModal);
$('#modal-scrim').addEventListener('click', closeModal);

/* 确认弹层 */
$('#confirm-close').addEventListener('click', closeConfirm);
$('#confirm-cancel').addEventListener('click', closeConfirm);
$('#confirm-scrim').addEventListener('click', closeConfirm);
$('#confirm-ok').addEventListener('click', () => {
  const cb = state.confirmCb;
  closeConfirm();
  if (cb) cb();
});

/* 类型模板编辑弹层 */
$('#tplmodal-close').addEventListener('click', closeTplModal);
$('#tplmodal-cancel').addEventListener('click', closeTplModal);
$('#tplmodal-scrim').addEventListener('click', closeTplModal);
$('#tplmodal-save').addEventListener('click', saveTpl);

$('#btn-new-tag').addEventListener('click', () => openTagModal('create'));
$('#btn-manage-tag').addEventListener('click', openTagManage);
$('#tagmodal-close').addEventListener('click', closeTagModal);
$('#tagmodal-cancel').addEventListener('click', closeTagModal);
$('#tagmodal-scrim').addEventListener('click', closeTagModal);
$('#tagmodal-save').addEventListener('click', saveTag);
$('#tag-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveTag(); });

$('#tagmanage-close').addEventListener('click', closeTagManage);
$('#tagmanage-done').addEventListener('click', closeTagManage);
$('#tagmanage-scrim').addEventListener('click', closeTagManage);

$('#tagpick-close').addEventListener('click', closeTagPick);
$('#tagpick-scrim').addEventListener('click', closeTagPick);
$('#tagpick-add').addEventListener('click', () => {
  const name = $('#tagpick-new').value.trim();
  if (!name) return;
  if (!TAGS.includes(name)) { TAGS.push(name); saveRegistry(); }
  const entry = ENTRIES.find(x => x.id === state.tagTarget);
  if (entry && !entry.tags.includes(name)) entry.tags.push(name);
  $('#tagpick-new').value = '';
  renderAll();
  openTagPick(state.tagTarget);
  toast('已加入标签', name);
});

/* ── 字段列表交互（条目编辑器与类型模板共用一套，靠 data-scope 区分） ── */
function addFieldTo(scope){
  const d = draftBox(scope);
  if (!d) return;
  syncFieldsFromDom(scope);
  d.fields.push((scope === 'tpl' || scope === 'newtype') ? { k: '', secret: true } : { k: '', v: '' });
  renderFieldRows(scope);
  const box = fieldBox(scope);
  const ks = box ? [...box.querySelectorAll('.k')] : [];
  if (ks.length) ks[ks.length - 1].focus();
}

$('#add-field').addEventListener('click', () => addFieldTo('entry'));
$('#tpl-add-field').addEventListener('click', () => addFieldTo('tpl'));

function bindFieldList(el){
  if (!el) return;
  const scope = el.dataset.scope || 'entry';
  let dragIdx = null;

  el.addEventListener('input', () => {
    syncFieldsFromDom(scope);
    if (scope === 'entry') updateEditorHint();
  });

  el.addEventListener('mousedown', ev => {
    const row = ev.target.closest('.field-item');
    if (row) row.draggable = !!ev.target.closest('.fi-grip');
  });

  el.addEventListener('dragstart', ev => {
    const row = ev.target.closest('.field-item');
    if (!row) return;
    syncFieldsFromDom(scope);
    dragIdx = Number(row.dataset.row);
    row.classList.add('dragging');
    if (ev.dataTransfer){
      ev.dataTransfer.effectAllowed = 'move';
      try { ev.dataTransfer.setData('text/plain', String(dragIdx)); } catch (e) {}
    }
  });

  el.addEventListener('dragover', ev => {
    const row = ev.target.closest('.field-item');
    if (!row || dragIdx == null) return;
    ev.preventDefault();
    [...el.querySelectorAll('.field-item')].forEach(r => r.classList.remove('drop-target'));
    if (Number(row.dataset.row) !== dragIdx) row.classList.add('drop-target');
  });

  el.addEventListener('dragend', () => {
    dragIdx = null;
    [...el.querySelectorAll('.field-item')].forEach(r => r.classList.remove('dragging', 'drop-target'));
  });

  el.addEventListener('drop', ev => {
    const row = ev.target.closest('.field-item');
    if (!row || dragIdx == null) return;
    ev.preventDefault();
    const from = dragIdx;
    const to = Number(row.dataset.row);
    dragIdx = null;
    const d = draftBox(scope);
    if (!d || from === to) return;
    const moved = d.fields.splice(from, 1)[0];
    d.fields.splice(to, 0, moved);
    renderFieldRows(scope);
  });

  el.addEventListener('click', ev => {
    const btn = ev.target.closest('button');
    const d = draftBox(scope);
    if (!btn || !d) return;
    const i = Number(btn.dataset.secret ?? btn.dataset.multi ?? btn.dataset.delf ?? btn.dataset.up ?? btn.dataset.down);

    if (btn.dataset.secret != null){
      syncFieldsFromDom(scope);
      const f = d.fields[i];
      if (f){ f.secret = !f.secret; renderFieldRows(scope); }
      return;
    }
    if (btn.dataset.multi != null){
      syncFieldsFromDom(scope);
      const f = d.fields[i];
      if (f){ f.multiline = !f.multiline; renderFieldRows(scope); }
      return;
    }
    if (btn.dataset.delf != null){
      syncFieldsFromDom(scope);
      d.fields.splice(i, 1);
      renderFieldRows(scope);
      if (scope === 'entry') updateEditorHint();
      return;
    }
    if (btn.dataset.up != null || btn.dataset.down != null){
      syncFieldsFromDom(scope);
      const j = btn.dataset.up != null ? i - 1 : i + 1;
      if (j < 0 || j >= d.fields.length) return;
      const moved = d.fields.splice(i, 1)[0];
      d.fields.splice(j, 0, moved);
      renderFieldRows(scope);
    }
  });
}

bindFieldList($('#field-list'));
bindFieldList($('#tpl-field-list'));
bindFieldList($('#type-field-list'));

/* 新建类型：选「空」模板时才展开字段编辑器（FR-E8） */
function syncTypeTplVisibility(){
  const box = $('#type-custom-tpl');
  if (!box) return;
  box.style.display = ($('#type-template').value === 'empty' && !state.typeRenaming) ? '' : 'none';
}
$('#type-template').addEventListener('change', syncTypeTplVisibility);
$('#type-add-field').addEventListener('click', () => addFieldTo('newtype'));


$('#modal').addEventListener('click', ev => {
  const d = state.draft;
  const btn = ev.target.closest('button');
  if (!btn || !d) return;

  if (btn.dataset.type){
    if (btn.dataset.type === d.type) return;
    syncFieldsFromDom();
    d.type = btn.dataset.type;
    d.loginMethod = d.type === 'login' ? 'password' : null;
    d.idp = null;
    d.fields = fieldsFor(d.type, d.loginMethod);
    renderModalEditor();
    $('#modal-hint').textContent = '已切换类型：字段列表按该类型默认结构重置（类型决定字段结构，FR-E8）';
    return;
  }
  if (btn.dataset.method){
    syncFieldsFromDom();
    d.loginMethod = btn.dataset.method;
    if (d.loginMethod !== 'oauth') d.idp = null;
    d.fields = fieldsFor('login', d.loginMethod);
    renderModalEditor();
    $('#modal-hint').textContent = '已切换登录方式：字段按该方式重置（' + METHOD_META[d.loginMethod] + '）';
    return;
  }

  if (btn.dataset.mtag){
    const t = btn.dataset.mtag;
    const at = d.tags.indexOf(t);
    if (at >= 0) d.tags.splice(at, 1); else d.tags.push(t);
    renderModalTags();
    renderRail();
  }
});

$('#modal').addEventListener('keydown', ev => {
  if (ev.target.id !== 'modal-tag-new' || ev.key !== 'Enter') return;
  ev.preventDefault();
  const name = ev.target.value.trim();
  if (!name) return;
  if (!TAGS.includes(name)) { TAGS.push(name); saveRegistry(); }
  if (!state.draft.tags.includes(name)) state.draft.tags.push(name);
  renderModalTags();
  renderRail();
  const inp = $('#modal-tag-new');
  if (inp) inp.focus();
});

async function saveModal(){
  const title = $('#new-title').value.trim();
  if (!title){ toast('标题必填'); return; }
  const d = state.draft;
  syncFieldsFromDom();

  const fields = [];
  d.fields.forEach(f => {
    const k = String(f.k || '').trim();
    if (!k) return;
    const rec = { ...f, k, v: f.v == null ? '' : f.v };
    if (isPassField(rec)){ rec.secret = true; if (rec.v) rec.hint = passHint(rec.v); }
    if (!rec.v) delete rec.hint;
    fields.push(rec);
  });

  const userField = fields.find(f => /^(用户名|账号|绑定账号|卡号|证件号)/.test(f.k));
  const isLogin   = d.type === 'login';
  const method    = isLogin ? (d.loginMethod || 'password') : null;
  const idpSel    = $('#new-idp');
  const idp       = (isLogin && method === 'oauth')
    ? (idpSel ? idpSel.value : d.idp) : null;
  const pw        = fields.find(isPassField);
  const strength  = (isLogin || d.type === 'account') && pw && pw.v ? scorePass(pw.v) : null;

  const patch = {
    title, type: d.type, fields,
    user: userField ? userField.v : null,
    url: $('#new-url').value.trim().replace(/^https?:\/\//, '') || null,
    notes: $('#new-notes').value.trim(),
    tags: [...d.tags], updated: '刚刚',
    loginMethod: method, strength,
  };
  if (idp) patch.idp = idp;

  const existing = state.editing ? ENTRIES.find(x => x.id === state.editing) : null;
  if (existing){
    if (!idp) delete existing.idp;
    Object.assign(existing, patch);
    existing.hist.unshift(['刚刚', '编辑']);
    if (VAULT) await VaultCore.updateRecord(STORE, VAULT, { id: existing.id, plaintext: existing });
    closeModal();
    renderAll();
    toast('已加密并写入分片', 'log-MAC-2F.enc');
    return;
  }

  const entry = { id: 'e' + Date.now().toString(36), ...patch, hist: [['刚刚', '创建']] };
  if (!idp) delete entry.idp;
  ENTRIES.unshift(entry);
  if (VAULT) await VaultCore.addRecord(STORE, VAULT, { plaintext: entry });
  state.cat = 'all'; state.tag = null; state.q = '';
  $('#search').value = '';
  $$('.cat[data-cat]').forEach((x, i) => x.classList.toggle('active', i === 0));
  state.selected = entry.id;
  if (state.order) state.order.unshift(entry.id);
  closeModal();
  renderRail();
  renderList();
  renderDetail();
  toast('已加密并写入分片', 'log-MAC-2F.enc');
}

$('#modal-save').addEventListener('click', saveModal);

$('#sync-state').addEventListener('click', () => toast('干净 · 与远端一致','12:04'));

/* 排序控件 */
$('#btn-sort').addEventListener('click', ev => {
  ev.stopPropagation();
  const open = $('#sort-menu').classList.toggle('on');
  $('#btn-sort').setAttribute('aria-expanded', open ? 'true' : 'false');
});
$$('#sort-menu button').forEach(b => b.addEventListener('click', () => setSort(b.dataset.sort)));
document.addEventListener('click', ev => {
  if (!ev.target.closest('.sort-wrap')) closeSortMenu();
});

/* ══ 移动端与 PWA（M0.5） ═══════════════════════════════ */
const MQ_MOBILE = window.matchMedia('(max-width: 720px)');
let installEvent = null;

function isMobile(){ return MQ_MOBILE.matches; }

function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function isIOS(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/* 详情顶栏动作：与桌面 detail-actions 同语义，手机端直出成按钮，不再藏进 ⋯ 菜单 */
function renderDetailActs(){
  const box = $('#m-acts');
  if (!box) return;
  const e = ENTRIES.find(x => x.id === state.selected);
  if (!e){ box.innerHTML = ''; return; }
  box.innerHTML = e.deleted
    ? `<button type="button" class="m-act" data-mact="restore">恢复</button>
       <button type="button" class="m-act danger" data-mact="purge">彻底删除</button>`
    : `<button type="button" class="m-act" data-mact="edit">编辑</button>
       <button type="button" class="m-act star ${e.fav ? 'on' : ''}" data-mact="fav" aria-label="${e.fav ? '取消收藏' : '收藏'}">${e.fav ? '★' : '☆'}</button>
       <button type="button" class="m-act danger" data-mact="del">删除</button>`;
}

function setPane(pane){
  state.pane = pane;
  document.body.classList.toggle('m-detail', isMobile() && pane === 'detail');
  renderDetailActs();
}

const NAV_ICONS = {
  all:      'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  fav:      'M12 3.8l2.6 5.3 5.8.9-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 10l5.8-.9z',
  login:    'M14.4 4H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4.6M10.2 8.6 13.6 12l-3.4 3.4M13.4 12H3.6',
  account:  'M12 4.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8M4.8 20c0-3.5 3.2-5.8 7.2-5.8s7.2 2.3 7.2 5.8',
  card:     'M3.4 6.4h17.2v11.2H3.4zM3.4 10.2h17.2M6.6 14.4h3.6',
  note:     'M6.2 3.6h8.4l3.6 3.6v12.4a.8.8 0 0 1-.8.8H6.2a.8.8 0 0 1-.8-.8V4.4a.8.8 0 0 1 .8-.8M9 11.4h6M9 15h6',
  identity: 'M3.4 5.6h17.2v12.8H3.4zM9 11.2a1.9 1.9 0 1 0 0-.1M5.9 15.6c.5-1.5 1.7-2.3 3.1-2.3s2.6.8 3.1 2.3M14.4 10.4h4M14.4 13.8h3',
  custom:   'M12 3.6 20.4 8v8L12 20.4 3.6 16V8z',
  tag:      'M9.6 4 7.6 20M16.4 4l-2 16M4.4 9h15.2M3.6 15h15.2',
  trash:    'M4.6 7h14.8M9.4 7V4.6h5.2V7M6.6 7l.9 13h9l.9-13M10.4 10.4v6.2M13.6 10.4v6.2',
};

function navIcon(name){
  const d = NAV_ICONS[name] || NAV_ICONS.custom;
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
}

/* 标签没有可区分的图标：用名称首字符代替（收纳态也一眼能分） */
function tagGlyph(name){
  const ch = String(name || '?').trim().charAt(0) || '?';
  return '<b class="m-nav-glyph">' + esc(ch.toUpperCase()) + '</b>';
}

function navItem(attr, key, label, count, on, icon){
  const lead = icon === 'tag' ? tagGlyph(label) : navIcon(icon);
  return '<button type="button" class="m-nav-item' + (on ? ' on' : '') + '" '
    + attr + '="' + esc(key) + '" aria-label="' + esc(label) + ' · ' + count + '">'
    + lead + '<span>' + esc(label) + '</span><i>' + count + '</i></button>';
}

/* 侧边导航：所有分组都由真实数据渲染，收缩态只留图标（CSS 控制） */
function renderMobileNav(){
  const box = $('#m-nav-body');
  if (!box) return;
  const c = countByType();
  const alive = ENTRIES.filter(e => !e.deleted).length;
  const favN = ENTRIES.filter(e => e.fav && !e.deleted).length;
  const trashN = ENTRIES.filter(e => e.deleted).length;

  let html = '<div class="m-nav-group"><div class="m-nav-label">保险库</div>'
    + navItem('data-mcat', 'all', '全部', alive, state.cat === 'all' && !state.tag && !state.fav, 'all')
    + navItem('data-mfav', '1', '收藏', favN, state.fav, 'fav')
    + TYPES.map(t => navItem('data-mcat', t.key, t.label, c[t.key] || 0,
        state.cat === t.key && !state.tag && !state.fav,
        t.builtin ? t.key : 'custom')).join('')
    + '</div>';

  if (TAGS.length){
    html += '<div class="m-nav-group"><div class="m-nav-label">标签</div>'
      + TAGS.map(t => navItem('data-mtag', t, t, tagCount(t), state.tag === t, 'tag')).join('')
      + '</div>';
  }

  html += '<div class="m-nav-group"><div class="m-nav-label">回收站</div>'
    + navItem('data-mcat', 'trash', '已删除', trashN, state.cat === 'trash', 'trash')
    + '</div>';

  box.innerHTML = html;
}

function railIsOpen(){ return document.body.classList.contains('m-rail-open'); }

/* 栅展开 / 收回；persist=true 时记住选择（与排序偏好同级，不碰密钥） */
function setRailOpen(on, persist){
  document.body.classList.toggle('m-rail-open', !!on);
  const t = $('#m-nav-toggle');
  if (t){
    t.setAttribute('aria-expanded', on ? 'true' : 'false');
    t.setAttribute('aria-label', on ? '收缩导航' : '展开导航');
  }
  if (persist){
    try { localStorage.setItem('vault.railOpen', on ? '1' : '0'); } catch (e) {}
  }
}

function toggleRail(){ setRailOpen(!railIsOpen(), true); }

/* 键位提示按平台显示：Windows 上是 Ctrl+K，Mac 上是 ⌘K */
function setSearchKbd(){
  const kbd = $('#search-kbd');
  if (!kbd) return;
  const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
  kbd.textContent = mac ? '⌘K' : 'Ctrl K';
}

function buildRunModeCard(){
  const inner = document.querySelector('.settings-inner');
  if (!inner || document.getElementById('runmode-group')) return;
  inner.insertAdjacentHTML('beforeend', `
    <section class="sgroup" id="runmode-group">
      <h2 class="sgroup-title">运行形态</h2>
      <p class="sgroup-desc">不是「已安装」就不该显示「已安装」。</p>
      <div class="srow"><span>独立模式（PWA）</span><b id="rm-standalone">—</b></div>
      <div class="srow"><span>Service Worker</span><b id="rm-sw">—</b></div>
      <div class="srow"><span>可安装</span><b id="rm-install">—</b></div>
      <div class="srow"><span>离线缓存</span><b id="rm-cache">仅 UI shell</b></div>
    </section>`);
}

function updateRunMode(){
  const st = isStandalone();
  const el = id => document.getElementById(id);
  if (!el('rm-standalone')) return;
  el('rm-standalone').textContent = st ? '是 · 独立窗口' : '否 · 浏览器标签';
  el('rm-sw').textContent = !('serviceWorker' in navigator) ? '不支持'
    : (navigator.serviceWorker.controller ? '已接管' : '已注册 · 等待接管');
  el('rm-install').textContent = st ? '已安装'
    : installEvent ? '可以安装' : (isIOS() ? '需 Safari 手动添加' : '浏览器未提供');
  el('rm-cache').textContent = '仅 UI shell · 数据不缓存';
}

function showInstallBanner(){ $('#install-banner') && $('#install-banner').classList.add('on'); }
function hideInstallBanner(){ $('#install-banner') && $('#install-banner').classList.remove('on'); }
function showIOSGuide(){ $('#iosguide-scrim') && $('#iosguide-scrim').classList.add('on'); $('#iosguide') && $('#iosguide').classList.add('on'); }
function closeIOSGuide(){
  $('#iosguide-scrim') && $('#iosguide-scrim').classList.remove('on');
  $('#iosguide') && $('#iosguide').classList.remove('on');
}

function initMobilePWA(){
  MQ_MOBILE.addEventListener('change', () => { setPane(state.pane || 'list'); if (!isMobile()) setRailOpen(false); renderMobileNav(); });

  const back = $('#m-back');
  if (back) back.addEventListener('click', () => setPane('list'));

  const acts = $('#m-acts');
  if (acts) acts.addEventListener('click', ev => {
    const b = ev.target.closest('[data-mact]');
    if (!b) return;
    const e = ENTRIES.find(x => x.id === state.selected);
    if (!e) return;
    const act = b.dataset.mact;
    if (act === 'edit') openModal(e.id);
    if (act === 'fav') toggleFav(e.id);
    if (act === 'del') askDelete(e.id);
    if (act === 'restore') restoreEntry(e.id);
    if (act === 'purge') askPurge(e.id);
  });

  const navToggle = $('#m-nav-toggle');
  if (navToggle) navToggle.addEventListener('click', ev => {
    ev.stopPropagation();
    toggleRail();
  });

  const navBody = $('#m-nav-body');
  if (navBody) navBody.addEventListener('click', ev => {
    const b = ev.target.closest('.m-nav-item');
    if (!b) return;
    if (b.hasAttribute('data-mfav')){ state.fav = true; state.cat = 'all'; state.tag = null; }
    else if (b.dataset.mtag){ state.fav = false; state.cat = 'all'; state.tag = b.dataset.mtag; }
    else { state.fav = false; state.tag = null; state.cat = b.dataset.mcat; }
    setPane('list');
    renderRail();
    renderList();
    renderDetail();
  });

  window.addEventListener('beforeinstallprompt', ev => {
    ev.preventDefault();
    installEvent = ev;
    showInstallBanner();
    updateRunMode();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    hideInstallBanner();
    updateRunMode();
    toast('已安装到桌面');
  });

  const go = $('#install-go');
  if (go) go.addEventListener('click', async () => {
    if (!installEvent) return;
    installEvent.prompt();
    try { await installEvent.userChoice; } catch (err) {}
    installEvent = null;
    hideInstallBanner();
    updateRunMode();
  });
  const later = $('#install-later');
  if (later) later.addEventListener('click', hideInstallBanner);

  if (isIOS() && !isStandalone() && !localStorage.getItem('vault.iosGuide')) showIOSGuide();
  ['iosguide-ok', 'iosguide-close', 'iosguide-scrim'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => { localStorage.setItem('vault.iosGuide', '1'); closeIOSGuide(); });
  });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))){
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) toast('有新版本', '刷新后生效');
        });
      });
    }).catch(() => {});
  }

  let railPref = null;
  try { railPref = localStorage.getItem('vault.railOpen'); } catch (e) {}
  setRailOpen(railPref === '1', false);
  setSearchKbd();

  buildRunModeCard();
  updateRunMode();
  setPane('list');
}

if (state.sort === 'manual' && !state.order) state.sort = 'time';

initMobilePWA();

/* M1 首次启动需等 window.VaultCore（module 加载）就绪后再初始化 */
window.addEventListener('DOMContentLoaded', () => { void initApp(); });

async function initApp(){
  loadRegistry();   // 恢复类型 / 标签定义与顺序（③ §3），必须在任何渲染之前
  STORE = new VaultCore.BrowserStore('vault');
  try {
    const saved = localStorage.getItem('vault.sort');
    if (saved && ['time','title','type','manual'].includes(saved)) setSort(saved);
    const savedOrder = localStorage.getItem('vault.order');
    if (savedOrder) state.order = JSON.parse(savedOrder);
  } catch (e) {}
  const initial = new URLSearchParams(location.search).get('view');
  // ② §7.5：深链只记住目标；未解锁时一律先显示解锁页，绝不跳过 setView（否则全视图隐藏 → 黑屏）
  if (initial === 'vault' || initial === 'settings') PENDING_VIEW = initial;
  const meta = await STORE.loadMeta();
  await refreshLockUI();   // KDF / 设备 / 便利副本状态一律读真实值（③ §5、规则 5）
  if (!meta){
    showSetup();
  } else {
    setView('unlock');
    setTimeout(() => $('#master').focus(), 60);
  }
}

/* ── 首次创建金库（M1 设置流）── */
function showSetup(){
  SETUP_MODE = true;
  $('#unlock-form').style.display = 'none';
  $('#setup-form').style.display = '';
  setView('unlock');
  setTimeout(() => $('#setup-pass').focus(), 60);
}

async function doSetup(){
  const pw = $('#setup-pass').value;
  const pw2 = $('#setup-pass2').value;
  if (pw.length < 16){ $('#setup-hint').textContent = '主密码至少 16 字符（Q3-B）'; return; }
  if (pw !== pw2){ $('#setup-hint').textContent = '两次输入不一致'; return; }
  const r = await VaultCore.setupVault(STORE, { masterPassword: pw, deviceId: getDeviceId() });
  VAULT = { dek: r.session.dek, secretKey: r.session.secretKey, deviceId: getDeviceId(), vaultId: r.meta.vaultId, recoveryCode: r.recoveryCode };
  // ADR-015：创建后立即建立本机便利副本，此后日常解锁只需主密码
  try {
    await VaultCore.saveSecretKey(r.meta.vaultId, r.session.secretKey);
  } catch (e) {
    const msg = '便利副本写入失败：' + (e.message || '未知错误') + '（下次仍需手输恢复码）';
    toast(msg);
    const h = $('#cv-hint'); if (h) h.textContent = msg;
  }
  ENTRIES = [];
  await importSample();
  $('#setup-form').style.display = 'none';
  $('#setup-recovery-block').style.display = '';
  $('#setup-recovery').textContent = r.recoveryCode;
  // 创建表单里的主密码明文同样不留（FR-U5）
  $('#setup-pass').value = '';
  $('#setup-pass2').value = '';
  await refreshLockUI();
}

function finishSetup(){
  SETUP_MODE = false;
  setView('vault');
  renderAll();
  toast('保险库已创建，请妥善保管 26 位恢复码');
}

async function importSample(){
  for (const e of SAMPLE_ENTRIES){
    const id = 'e' + Math.random().toString(36).slice(2, 8);
    const rec = { id, ...e, hist: [['导入', '测试数据']] };
    ENTRIES.unshift(rec);
    if (VAULT) await VaultCore.addRecord(STORE, VAULT, { plaintext: rec });
  }
  renderAll();
}

$('#setup-form').addEventListener('submit', e => { e.preventDefault(); doSetup(); });
$('#setup-done').addEventListener('click', finishSetup);

/* ══ 便利副本真实状态（FR-K2/K3/K4 · ADR-015/023 · ③ §5）══ */

// 读取 IndexedDB 便利副本；失败必须显式报错，不静默当成「没有副本」（规则 6）
async function readConvenience(vaultId){
  if (!vaultId) return null;
  try {
    return await VaultCore.loadSecretKey(vaultId);
  } catch (e) {
    toast('本机便利副本读取失败：' + (e.message || '未知错误'));
    return null;
  }
}

// 解锁页：KDF 参数、设备 ID、副本状态全部读真实值，不留写死的假状态（规则 5）
async function refreshLockUI(){
  const meta = await STORE.loadMeta();
  const devEl = $('#lock-device-id'); if (devEl) devEl.textContent = getDeviceId();
  const kdfEl = $('#lock-kdf');
  if (kdfEl) kdfEl.textContent = meta ? 'Argon2id · ' + VaultCore.kdfSummary(meta) : 'Argon2id · 待创建';
  const row = $('#recovery-row');
  const alt = $('#recovery-alt');
  if (!meta){
    const s = $('#lock-recovery-status'); if (s) s.textContent = '尚未创建金库';
    const h = $('#lock-convenience-hint'); if (h) h.textContent = '创建后会为本机保存恢复码便利副本';
    if (row) row.style.display = 'none';
    if (alt) alt.style.display = 'none';
    return;
  }
  const has = !!(await readConvenience(meta.vaultId));
  const s = $('#lock-recovery-status');
  if (s) s.textContent = has ? '恢复码便利副本：本机已保存' : '恢复码便利副本：未保存';
  const h = $('#lock-convenience-hint');
  if (h) h.textContent = has
    ? '本机已保存恢复码，只需输入主密码'
    : '本机未保存恢复码，需同时输入主密码与 26 位恢复码';
  // ③ §3：有副本时默认不显示恢复码输入框，只留一个极小入口防死锁
  if (row) row.style.display = has ? 'none' : '';
  if (alt) alt.style.display = has ? '' : 'none';
  const label = $('#recovery-label');
  if (label) label.textContent = '恢复码（26 位）';
  const rc = $('#recovery'); if (rc && has) rc.value = '';
}

/* ③ §3：极小兜底入口——副本损坏 / 换金库时能手动输恢复码，避免被锁死 */
$('#use-recovery')?.addEventListener('click', () => {
  const row = $('#recovery-row'); if (row) row.style.display = '';
  const alt = $('#recovery-alt'); if (alt) alt.style.display = 'none';
  const h = $('#lock-convenience-hint');
  if (h) h.textContent = '输入 26 位恢复码以覆盖本机副本';
  const rc = $('#recovery'); if (rc) rc.focus();
});

// 设置页：金库指纹 / KDF 参数 / 副本状态（③ §5）
async function refreshVaultUI(){
  const meta = await STORE.loadMeta();
  if (!meta) return;
  const fp = $('#vault-fingerprint'); if (fp) fp.textContent = VaultCore.vaultFingerprint(meta);
  const kdf = $('#vault-kdf'); if (kdf) kdf.textContent = VaultCore.kdfSummary(meta);
  const cached = await readConvenience(meta.vaultId);
  const st = $('#cv-status');
  if (st) st.textContent = cached ? '已保存 · 解锁仅需主密码' : '未保存 · 下次需手输恢复码';
}

// FR-K3：主动清除本机副本；ADR-023 锁定金库时不清，只有这里清
$('#cv-clear')?.addEventListener('click', async () => {
  const meta = await STORE.loadMeta();
  if (!meta) return;
  const h = $('#cv-hint');
  try {
    await VaultCore.clearSecretKey(meta.vaultId);
    if (h) h.textContent = '已清除本机副本。下次解锁需重新输入 26 位恢复码。';
  } catch (e) {
    if (h) h.textContent = '清除失败：' + (e.message || '未知错误');
    return;
  }
  await refreshVaultUI();
  await refreshLockUI();
});

// FR-K4：重录恢复码必须校验归属；不匹配明确报「该恢复码不属于此金库」，不能报成密码错误
$('#cv-verify')?.addEventListener('click', async () => {
  const code = $('#cv-recovery').value.trim();
  const h = $('#cv-hint');
  if (!code){ if (h) h.textContent = '请输入 26 位恢复码'; return; }
  if (!VAULT || !VAULT.secretKey){
    if (h) h.textContent = '当前未解锁，无法校验归属；请先在解锁页输入恢复码';
    return;
  }
  const sk = VaultCore.matchRecoveryCode(code, VAULT.secretKey);
  if (!sk){ if (h) h.textContent = '该恢复码不属于此金库'; return; }
  try {
    await VaultCore.saveSecretKey(VAULT.vaultId, sk);
    if (h) h.textContent = '校验通过，本机便利副本已重建';
    $('#cv-recovery').value = '';
  } catch (e) {
    if (h) h.textContent = '保存失败：' + (e.message || '未知错误');
    return;
  }
  await refreshVaultUI();
  await refreshLockUI();
});

/* ══ 备份 / 恢复 / 重新生成恢复码（ADR-020/021、FR-SET2/SET3、FR-K5、② §3）══ */

// 错误要「吵」且说清后果（规则 6）：任何失败都必须明示本机数据未被改动
function backupError(e){
  const m = (e && e.message) || '未知错误';
  if (m === 'E_BACKUP_CORRUPT') return '备份已损坏或被篡改';
  if (m === 'E_BACKUP_FORMAT') return '这不是有效的 .vaultenc 备份文件';
  if (m === 'E_UNLOCK') return '主密码或恢复码错误（或备份不属于此金库）';
  if (m === 'E_INTEGRITY_FAIL') return '记录哈希链不完整，已拒绝';
  if (m === 'E_NO_VAULT') return '本机尚未创建金库';
  return m;
}

// FR-SET2：导出单文件加密备份。备份不含恢复码，故离线保管时须与恢复码分开（Q11）。
$('#backup-export')?.addEventListener('click', async () => {
  if (!VAULT){ toast('请先解锁金库'); return; }
  try {
    const file = await VaultCore.exportBackup(STORE, VAULT);
    const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vault-' + new Date().toISOString().slice(0, 10) + '.vaultenc';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('已导出加密备份 · 请离线保管，恢复码不要与备份同放');
  } catch (e) {
    toast('导出失败：' + backupError(e));
  }
});

// FR-SET3：选文件 → 弹层收主密码 + 恢复码 → 整库覆盖
let PENDING_BACKUP = null;
$('#backup-import')?.addEventListener('click', () => $('#backup-file')?.click());
$('#backup-file')?.addEventListener('change', async ev => {
  const f = ev.target.files && ev.target.files[0];
  ev.target.value = '';                       // 允许重复选同一文件
  if (!f) return;
  try {
    PENDING_BACKUP = JSON.parse(await f.text());
    $('#import-file-name').textContent = f.name + ' · ' + (f.size / 1024).toFixed(1) + ' KB';
    $('#import-pass').value = '';
    $('#import-recovery').value = '';
    $('#import-hint').textContent = '';
    $('#importmodal-scrim').classList.add('on');
    $('#importmodal').classList.add('on');
    setTimeout(() => $('#import-pass').focus(), 50);
  } catch (e) {
    PENDING_BACKUP = null;
    toast('备份文件不是有效 JSON：' + ((e && e.message) || '未知错误'));
  }
});

function closeImportModal(){
  PENDING_BACKUP = null;
  $('#import-pass').value = '';
  $('#import-recovery').value = '';
  $('#importmodal-scrim').classList.remove('on');
  $('#importmodal').classList.remove('on');
}
$('#importmodal-close')?.addEventListener('click', closeImportModal);
$('#importmodal-cancel')?.addEventListener('click', closeImportModal);
$('#importmodal-scrim')?.addEventListener('click', closeImportModal);
$('#importmodal-ok')?.addEventListener('click', async () => {
  const hint = $('#import-hint');
  const pw = $('#import-pass').value;
  const rc = ($('#import-recovery').value || '').trim();
  if (!PENDING_BACKUP){ hint.textContent = '请先选择备份文件'; return; }
  if (!pw || !rc){ hint.textContent = '请输入主密码与 26 位恢复码'; return; }
  const btn = $('#importmodal-ok');
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = '恢复中…';
  try {
    const r = await VaultCore.importBackup(STORE, PENDING_BACKUP, {
      masterPassword: pw, recoveryCode: rc,
    });
    // 跨设备恢复后，把本机 deviceId 对齐到备份来源（备份 head 已固化来源 deviceId）。
    // 否则 getDeviceId() 仍是本机随机 ID，会与新金库 meta.deviceId 错位，后续解锁/新增可能读到错误分片。
    try { localStorage.setItem('vault.deviceId', r.meta.deviceId); } catch {}
    // ADR-015：恢复后建立本机便利副本，之后日常解锁只需主密码
    try {
      await VaultCore.saveSecretKey(r.meta.vaultId, r.secretKey);
    } catch (e) {
      toast('便利副本写入失败：' + ((e && e.message) || '未知错误') + '（仍可手输恢复码解锁）');
    }
    if (VAULT) VaultCore.lock(VAULT);         // FR-U5：清内存里的 DEK / Secret Key
    VAULT = null;
    ENTRIES = [];
    closeImportModal();
    setView('unlock');
    await refreshLockUI();
    toast('恢复完成 · ' + r.count + ' 条记录，请用主密码解锁');
  } catch (e) {
    hint.textContent = '恢复失败：' + backupError(e) + '（本机数据未改动）';
  } finally {
    btn.disabled = false; btn.textContent = orig;
    $('#import-pass').value = '';
    $('#import-recovery').value = '';
  }
});

// FR-K5：强提示「其余所有设备将全部失效」→ 验主密码 → 展示新码要求手抄
function resetRotateModal(){
  $('#rotate-pass').value = '';
  $('#rotate-hint').textContent = '';
  $('#rotate-step1').style.display = '';
  $('#rotate-step2').style.display = 'none';
  $('#rotate-new-code').textContent = '';
  const btn = $('#rotatemodal-ok');
  btn.textContent = '生成新恢复码';
  btn.dataset.done = '';
  btn.style.display = '';
}
function closeRotateModal(){
  resetRotateModal();
  $('#rotatemodal-scrim').classList.remove('on');
  $('#rotatemodal').classList.remove('on');
}
$('#rotate-recovery')?.addEventListener('click', () => {
  if (!VAULT){ toast('请先解锁金库'); return; }
  openConfirm({
    title: '重新生成恢复码',
    body: '当前 26 位恢复码将立即作废，其余所有设备将全部失效，必须逐台重新录入新码。旧备份文件仍对应旧恢复码。请确认你已能离线保管新码。',
    okText: '我已了解，继续',
    danger: true,
    onOk: () => {
      resetRotateModal();
      $('#rotatemodal-scrim').classList.add('on');
      $('#rotatemodal').classList.add('on');
      setTimeout(() => $('#rotate-pass').focus(), 50);
    },
  });
});
$('#rotatemodal-close')?.addEventListener('click', closeRotateModal);
$('#rotatemodal-cancel')?.addEventListener('click', closeRotateModal);
$('#rotatemodal-scrim')?.addEventListener('click', closeRotateModal);
$('#rotatemodal-ok')?.addEventListener('click', async () => {
  const btn = $('#rotatemodal-ok');
  if (btn.dataset.done === '1'){ closeRotateModal(); return; }
  const hint = $('#rotate-hint');
  const pw = $('#rotate-pass').value;
  if (!pw){ hint.textContent = '请输入当前主密码'; return; }
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = '重新封装中…';
  try {
    const r = await VaultCore.rotateRecoveryCode(STORE, VAULT, { masterPassword: pw });
    VAULT.secretKey = r.secretKey;
    VAULT.recoveryCode = r.recoveryCode;
    try { await VaultCore.saveSecretKey(VAULT.vaultId, r.secretKey); }
    catch (e) { toast('便利副本更新失败：' + ((e && e.message) || '未知错误')); }
    $('#rotate-pass').value = '';
    $('#rotate-step1').style.display = 'none';
    $('#rotate-step2').style.display = '';
    $('#rotate-new-code').textContent = r.recoveryCode;
    btn.textContent = '我已抄好，关闭';
    btn.dataset.done = '1';
    void refreshVaultUI();               // 指纹随 wrapped_dek 变化，接真实值
    toast('恢复码已更新 · 旧码作废，其余所有设备将全部失效');
  } catch (e) {
    hint.textContent = '失败：' + backupError(e) + '（恢复码未改动）';
  } finally {
    btn.disabled = false;
    if (btn.dataset.done !== '1') btn.textContent = orig;
  }
});

// FR-SET4（P1）尚未实现：不假装可用，点按明确告知（规则 5 / 规则 6）
$('#destroy-vault')?.addEventListener('click', () => {
  toast('销毁本地金库尚未实现（FR-SET4 / P1）');
});
