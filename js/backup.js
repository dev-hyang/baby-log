/* ============ 备份与恢复 ============
   小月亮是本机优先：全部记录和设置都在内存 / 本机里（家庭模式下再同步到云端），所以备份 = 现在这台设备上的 settings + entries（不含演示数据）。
   手动下载；或按周 / 按月 / 自定义天数定时备份到：云端（家庭模式；Supabase Storage 的 backups 桶，路径 family/<家庭id>/…，迁移 017）、
   Google Drive / Dropbox（各自要在 js/config.js 填应用 key）、这台电脑的文件夹（File System Access，桌面 Chrome / Edge）、或下载。
   云端、云盘和文件夹只留 60 天。网页没法在关着时跑：到期后下次打开应用时在后台做一次。
   恢复 = 把备份里的记录合并进来（已有同 id 的不动，缺的补上；设置合并），家庭模式下会同步给全家。老版本「导出备份」的文件也能恢复。 */
import { S, APP_VERSION } from "./state.js";
import { SB, lapsed, loadJSON, memberNames, saveJSON } from "./sync.js";
import { DROPBOX_APP_KEY, GOOGLE_CLIENT_ID } from "./config.js";
import { createDrives } from "./cloud-drives.js";
import { importJSON } from "./store.js";
import { $, esc, toast } from "./util.js";
import { t } from "./i18n.js";
import { refreshSettingsIfOpen } from "./me.js";

const CFG = { app: "xiaoyueliang", title: "小月亮", key: "xiaoyueliang.backup", file: "xiaoyueliang" };
const KEEP_DAYS = 60, FORMAT = 2;
const FILE_RE = new RegExp(`^${CFG.file}-(\\d{4}-\\d{2}-\\d{2})-\\d{4}\\.json$`);
const cloudReady = () => S.mode === "family" && !!(SB.family && SB.client);
const cutoff = () => new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);   // 文件名里的日期早于这天的清掉
const prefix = () => `family/${SB.family.id}`;

/* ---- 设置（存本机） ---- */
const DEFAULTS = { every: "off", days: 14, targets: ["download"], provider: "any", gdPath: "", dbxPath: "", last: null, lastInfo: "" };
const settings = () => ({ ...DEFAULTS, ...loadJSON(CFG.key, {}) });
const saveSettings = (patch) => { const s = { ...settings(), ...patch }; saveJSON(CFG.key, s); return s; };
const intervalDays = (s = settings()) => (s.every === "week" ? 7 : s.every === "month" ? 30 : s.every === "custom" ? Math.max(1, +s.days || 14) : 0);
const nextDue = (s = settings()) => { const d = intervalDays(s); if (!d) return null; return s.last ? new Date(new Date(s.last).getTime() + d * 864e5) : new Date(); };
const isDue = (s = settings()) => { const n = nextDue(s); return !!n && n.getTime() <= Date.now(); };

/* ---- 打包 ---- */
const stamp = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
const fileName = () => `${CFG.file}-${stamp()}.json`;
function collect() {
  const entries = S.entries.filter((e) => !e.demo).map(({ _dirty, ...e }) => e);
  return { app: CFG.app, version: 1, format: FORMAT, app_version: APP_VERSION, exported: Date.now(), exported_at: new Date().toISOString(), mode: S.mode,
    family: SB.family ? { id: SB.family.id, name: SB.family.name } : null, members: Object.values(SB.members || {}).map((m) => m.display_name || m), settings: JSON.parse(JSON.stringify(S.settings)), entries };
}
const rowCount = (d) => (Array.isArray(d.entries) ? d.entries.length : 0);
const toBlob = (d) => new Blob([JSON.stringify(d)], { type: "application/json" });
function download(blob, name) { const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }

/* ---- 这台电脑的文件夹（File System Access API：桌面 Chrome / Edge；手机和 Safari 没有） ---- */
const folderSupported = () => typeof window.showDirectoryPicker === "function";
const IDB = `${CFG.file}-fs`;
function idb() { return new Promise((res, rej) => { const r = indexedDB.open(IDB, 1); r.onupgradeneeded = () => r.result.createObjectStore("h"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbGet(k) { try { const db = await idb(); return await new Promise((res, rej) => { const q = db.transaction("h").objectStore("h").get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); } catch (e) { return null; } }
async function idbSet(k, v) { try { const db = await idb(); await new Promise((res, rej) => { const tx = db.transaction("h", "readwrite"); if (v == null) tx.objectStore("h").delete(k); else tx.objectStore("h").put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); } catch (e) { /* 忽略 */ } }
/** 电脑上各家云盘客户端的同步文件夹在哪（选「这台电脑的文件夹」时的提示） */
const PROVIDERS = [
  { id: "any", name: "任意文件夹 / 其他云盘", hint: "电脑上的任何文件夹都行；用别家云盘就选它的同步文件夹" },
  { id: "icloud", name: "iCloud Drive", hint: "Mac 在 ~/Library/Mobile Documents/com~apple~CloudDocs（访达侧栏的 iCloud 云盘）；Windows 装 iCloud 后在 C:\\Users\\<你>\\iCloudDrive" },
  { id: "onedrive", name: "OneDrive", hint: "Windows 一般在 C:\\Users\\<你>\\OneDrive，Mac 在 ~/OneDrive" },
  { id: "gdrive", name: "Google Drive（桌面版）", hint: "装了 Google Drive 桌面版后，Windows 一般在「G:\\我的云端硬盘」或「Google Drive」盘，Mac 在 ~/Google Drive" },
  { id: "dropbox", name: "Dropbox（桌面版）", hint: "Windows 一般在 C:\\Users\\<你>\\Dropbox，Mac 在 ~/Dropbox" },
];
/* ---- 数据库脚本：supabase/ 目录在电脑上、不进 git，备份文件里也没有；选一次它的位置，每次写文件夹时把 *.sql 一起拷进 sql/ 子目录 ---- */
async function pickSqlFolder() { const h = await window.showDirectoryPicker({ mode: "read", id: `${CFG.file}-sql`, startIn: "documents" }); await idbSet("sqldir", h); return h; }
const forgetSqlFolder = () => idbSet("sqldir", null);
async function sqlStatus() { const h = await idbGet("sqldir"); return h ? { name: h.name, handle: h } : { name: "" }; }
let lastSqlCopied = 0;
async function copySqlInto(dst, gesture) {
  const src = await idbGet("sqldir"); if (!src) return 0;
  let perm = "prompt"; try { perm = await src.queryPermission({ mode: "read" }); } catch (e) { /* 旧版 */ }
  if (perm !== "granted") { if (!gesture) return 0; if ((await src.requestPermission({ mode: "read" })) !== "granted") return 0; }
  const out = await dst.getDirectoryHandle("sql", { create: true }); let n = 0;
  const walk = async (dir, to) => { for await (const [name, h] of dir.entries()) {
    if (h.kind === "directory") { if (name.startsWith(".")) continue; await walk(h, await to.getDirectoryHandle(name, { create: true })); }
    else if (/\.(sql|md)$/i.test(name)) { const f = await h.getFile(), w = await (await to.getFileHandle(name, { create: true })).createWritable(); await w.write(await f.arrayBuffer()); await w.close(); n++; }
  } };
  await walk(src, out); return n;
}
async function pickFolder() { const h = await window.showDirectoryPicker({ mode: "readwrite", id: `${CFG.file}-backup`, startIn: "documents" }); await idbSet("dir", h); return h; }
const forgetFolder = () => idbSet("dir", null);
async function folderStatus() {
  if (!folderSupported()) return { supported: false, name: "", perm: "none" };
  const h = await idbGet("dir"); if (!h) return { supported: true, name: "", perm: "none" };
  let perm = "prompt"; try { perm = await h.queryPermission({ mode: "readwrite" }); } catch (e) { /* 旧版 */ }
  return { supported: true, name: h.name, perm, handle: h };
}
async function writeFolder(blob, name, gesture) {
  const st = await folderStatus(); if (!st.handle) throw new Error("NO_FOLDER");
  if (st.perm !== "granted") { if (!gesture) throw new Error("NEED_GESTURE"); const p = await st.handle.requestPermission({ mode: "readwrite" }); if (p !== "granted") throw new Error("NEED_GESTURE"); }
  const fh = await st.handle.getFileHandle(name, { create: true }), w = await fh.createWritable(); await w.write(blob); await w.close();
  const cut = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
  try { for await (const [n] of st.handle.entries()) { const m = FILE_RE.exec(n); if (m && m[1] < cut) await st.handle.removeEntry(n).catch(() => {}); } } catch (e) { /* 忽略 */ }
  try { const n = await copySqlInto(st.handle, gesture); if (n) lastSqlCopied = n; } catch (e) { /* 拷不动 SQL 不影响备份本身 */ }
}

/* ---- 云端（家庭模式；Supabase Storage backups 桶，迁移 017） ---- */
const bucket = () => SB.client.storage.from("backups");
async function writeCloud(blob, name) {
  if (!cloudReady()) throw new Error(t("云端备份要先加入家庭"));
  const { error } = await bucket().upload(`${prefix()}/${name}`, blob, { contentType: "application/json", upsert: true });
  if (error) throw new Error(/bucket|not found/i.test(error.message) ? t("还没执行迁移 017（云端备份桶），先在 Supabase 里执行 supabase/migrations/017_backups.sql") : error.message);
  const cut = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
  const old = (await listCloud()).filter((f) => (FILE_RE.exec(f.name) || [])[1] < cut).map((f) => `${prefix()}/${f.name}`);
  if (old.length) await bucket().remove(old).catch(() => {});
}
async function listCloud() {
  if (!cloudReady()) return [];
  const { data, error } = await bucket().list(prefix(), { limit: 200, sortBy: { column: "name", order: "desc" } });
  if (error) return [];
  return (data || []).filter((f) => FILE_RE.test(f.name)).map((f) => ({ name: f.name, at: f.created_at || f.updated_at || "", size: f.metadata?.size || 0 }));
}
async function readCloud(name) { const { data, error } = await bucket().download(`${prefix()}/${name}`); if (error) throw new Error(error.message); return JSON.parse(await data.text()); }
const deleteCloud = (name) => bucket().remove([`${prefix()}/${name}`]);

/* ---- 云盘：Google Drive、Dropbox（代码在 cloud-drives.js，四个应用共用；各自要在 js/config.js 填应用 key，见 README「云盘备份」）
   备份放在你在设置里填的文件夹路径下（Drive 默认「小月亮备份」；Dropbox 相对应用文件夹），不再往根目录随便放 ---- */
const DR = createDrives({ googleClientId: GOOGLE_CLIENT_ID, dropboxAppKey: DROPBOX_APP_KEY, tokPrefix: CFG.key, defaultFolder: "小月亮备份", fileRe: FILE_RE, keepDays: KEEP_DAYS, t, load: loadJSON, save: saveJSON, getPaths: () => ({ gd: settings().gdPath, dbx: settings().dbxPath }) });
const { tok, gdConfigured, dbxConfigured, gdOn, dbxOn, gdConnect, gdDisconnect, gdList, gdWrite, gdRead, gdDelete, dbxConnect, dbxDisconnect, dbxList, dbxWrite, dbxRead, dbxDelete } = DR;
/** 打开应用时调一次：从 Dropbox 授权页跳回来（?code=…&state=dbx）就换成令牌，勾上 Dropbox 并打开「同步、备份与恢复」 */
async function initProviders() {
  if (!new URL(location.href).searchParams.get("code")) return;
  try { if (await DR.initProviders()) { saveSettings({ targets: [...new Set([...settings().targets, "dropbox"])] }); toast(t("已连接 Dropbox")); } }
  catch (e) { toast(t("连接 Dropbox 失败：{msg}", { msg: e.message })); }
  S.tab = "sync"; UI.stale = true; refreshSettingsIfOpen();
}

/* ---- 跑一次备份 ---- */
const targetName = (k) => ({ download: t("下载"), folder: t("文件夹"), cloud: t("家庭云端"), gdrive: "Google Drive", dropbox: "Dropbox" }[k] || k);
async function runBackup(targets, gesture = false) {
  const data = collect(), blob = toBlob(data), name = fileName(), ok = [], failed = []; let needGesture = false;
  for (const tg of targets) {
    try {
      if (tg === "download") download(blob, name); else if (tg === "folder") await writeFolder(blob, name, gesture); else if (tg === "cloud") await writeCloud(blob, name);
      else if (tg === "gdrive") await gdWrite(blob, name, gesture); else if (tg === "dropbox") await dbxWrite(blob, name); else continue;
      ok.push(tg);
    } catch (e) { if (e.message === "NEED_GESTURE") needGesture = true; failed.push([tg, e.message === "NO_FOLDER" ? t("还没选文件夹") : e.message === "NEED_GESTURE" ? (tg === "gdrive" ? t("需要重新登录 Google") : t("需要你点一下授权")) : e.message]); }
  }
  const sqlN = lastSqlCopied; lastSqlCopied = 0;
  if (ok.length) saveSettings({ last: new Date().toISOString(), lastInfo: `${name} · ${ok.map(targetName).join("+")} · ${rowCount(data)} ${t("条")}${sqlN ? ` · ${t("SQL {n} 个", { n: sqlN })}` : ""}` });
  return { ok, failed, needGesture, name, rows: rowCount(data), sqlN };
}
let checked = false;
/** 打开应用（本机模式）或进入家庭后调一次：到期了就在后台备份 */
async function runScheduled() {
  if (checked) return; const s = settings(); if (!isDue(s) || !s.targets.length) return;
  if (s.targets.includes("cloud") && !cloudReady() && S.mode !== "local") return;   // 家庭模式还没连上：等 enterFamily 再调
  checked = true;
  try {
    const r = await runBackup(s.targets, false); S.backupPending = r.needGesture;
    if (r.ok.length) toast(t("已自动备份（{to}）", { to: r.ok.map(targetName).join("、") }));
    if (r.needGesture) toast(t("定时备份需要你点一下授权：去 我的 → 同步、备份与恢复 点「继续备份」"));
  } catch (e) { console.error(e); }
}

/* ---- 恢复 ---- */
function inspect(d) {
  if (!d || d.app !== CFG.app) return { ok: false, why: t("这不是小月亮的备份文件") };
  if (!Array.isArray(d.entries)) return { ok: false, why: t("文件里没有记录") };
  const kids = (d.settings?.children || []).map((c) => c.name).filter(Boolean);
  return { ok: true, exported_at: d.exported_at || (d.exported ? new Date(d.exported).toISOString() : ""), scope: d.family?.name || "", rows: d.entries.length, kids, same: !d.family?.id || !SB.family || d.family.id === SB.family.id };
}

/* ---- 界面：我的 → 同步、备份与恢复（views.js 的 SUB 调 syncHTML；状态变化后 refreshSettingsIfOpen 重画） ----
   一页四块：同步状态卡 → 备份（现在 / 定时 / 备份到哪，目的地是一格一格的卡片，手机一列、宽屏两列）→ 已有的备份（按来源切换）→ 从文件恢复；
   导出 CSV、演示数据、清空全部收在最下面的「数据工具」里，默认折叠。 */
const UI = { folder: null, lists: {}, loading: false, stale: true, preview: null, result: null, src: null };
const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");
const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
// where backups can be listed / restored from (the folder and plain downloads are read back through 「选文件」)
const SOURCES = {
  cloud: { icon: "☁", label: "家庭云端", ready: cloudReady, list: listCloud, read: readCloud, del: deleteCloud },
  gdrive: { icon: "▲", label: "Google Drive", ready: gdOn, list: () => gdList(false), read: gdRead, del: gdDelete },
  dropbox: { icon: "◆", label: "Dropbox", ready: dbxOn, list: dbxList, read: dbxRead, del: dbxDelete },
};
const available = () => Object.keys(SOURCES).filter((k) => SOURCES[k].ready());
function reload() {
  UI.stale = false; UI.loading = true;
  const srcs = available();
  Promise.all([folderStatus().catch(() => ({ supported: false, perm: "none", name: "" })), sqlStatus().catch(() => ({ name: "" })), ...srcs.map((k) => SOURCES[k].list().catch(() => []))])
    .then(([f, q, ...ls]) => { UI.folder = f; UI.sql = q; srcs.forEach((k, i) => { UI.lists[k] = ls[i]; }); UI.loading = false; refreshSettingsIfOpen(); });
}
/** 一句话给「我的」入口行用 */
function backupSummary() { const s = settings(); return s.last ? t("上次备份 {d}", { d: when(s.last) }) : t("还没备份过"); }
function syncHTML() {
  if (UI.stale) reload();
  const s = settings(), folder = UI.folder || { supported: folderSupported(), perm: "none", name: "" }, has = (k) => s.targets.includes(k), due = nextDue(s);
  const fam = cloudReady(), pending = S.entries.filter((e) => e._dirty).length;
  // 1) 同步状态
  const st = fam ? (pending ? ["wait", t("{n} 条待同步", { n: pending }), t("联网后会自动上传；也可以现在点一下")] : ["ok", t("家庭同步 · {n} 人", { n: memberNames().length || 1 }), esc(SB.family.name)])
    : lapsed() ? ["bad", t("家庭登录已失效，记录暂存本机"), t("再输一次邀请码就能回来，这期间记的内容会一并上传")]
    : ["off", t("保存在本设备"), t("换手机或清理浏览器数据会丢失；加入家庭，或在下面设好定时备份")];
  const status = `<div class="panel synccard ${st[0]}"><span class="sdot" aria-hidden="true"></span><div class="stext"><b>${st[1]}</b><small>${st[2]}</small></div>
    ${fam ? `<button class="btn" data-act="sb-sync">${t("立即同步")}</button>` : `<button class="btn primary" data-tab="family-members">${lapsed() ? t("重新加入") : t("加入家庭")}</button>`}</div>`;
  // 2) 备份：目的地卡片
  const card = (k, icon, label, desc, body = "", off = false) => `<div class="tcard" data-on="${has(k) && !off}" ${off ? 'data-off="true"' : ""}>
      <label class="tsel"><input type="checkbox" name="target" value="${k}" ${has(k) ? "checked" : ""} ${off ? "disabled" : ""}><span class="ti" aria-hidden="true">${icon}</span><span class="tt"><b>${label}</b><small>${desc}</small></span></label>
      ${body ? `<div class="tb">${body}</div>` : ""}</div>`;
  const gd = tok("gd"), dbx = tok("dbx");
  const pathRow = (name, label, val, ph) => `<span class="bk-row bk-path"><label class="small muted">${label}</label><input name="${name}" value="${esc(val || "")}" placeholder="${esc(ph)}" maxlength="120" autocomplete="off"></span>`;
  const notCfg = t("需要先在 js/config.js 里填好（见 README「云盘备份」）");
  const prov = PROVIDERS.find((x) => x.id === s.provider) || PROVIDERS[0];
  const provSel = `<span class="bk-row"><select name="provider" aria-label="${esc(t("云盘"))}">${PROVIDERS.map((x) => `<option value="${x.id}" ${x.id === prov.id ? "selected" : ""}>${esc(t(x.name))}</option>`).join("")}</select></span><span class="small muted">${esc(t(prov.hint))}</span>`;
  const sql = UI.sql || { name: "" };
  const folderBody = !folder.supported ? `<span class="small muted">${t("这个浏览器不支持直接写文件夹（手机和 Safari 没有）")}</span>`
    : folder.name ? `<span class="small muted">${t("文件夹：{n}", { n: esc(folder.name) })}</span>${folder.perm !== "granted" ? ` <button class="chip" data-act="bk-grant">${t("授权")}</button>` : ""} <button class="chip" data-act="bk-pick">${t("换文件夹")}</button> <button class="chip" data-act="bk-forget">${t("不再用")}</button>`
    : `<button class="chip" data-act="bk-pick">${t("选一个文件夹")}</button> <span class="small muted">${t("选一次就记住")}</span>`;
  const folderFull = folder.supported ? `${provSel}<span class="bk-row" style="margin-top:6px">${folderBody}</span>` : folderBody;
  const sqlBlock = `<div class="bk-sql"><b>⚠️ ${t("数据库脚本不在备份里")}</b><small>${t("supabase/schema.sql 和 migrations 只在你的电脑上（不进 git）。电脑没了，备份文件就导不回去。请把这个文件夹手动拷到云盘或别的位置；选了「这台电脑的文件夹」的话，可以让每次备份顺带把 .sql 一起拷进去：")}</small>
    <span class="bk-row">${sql.name ? `<span class="bk-pill ok">📁 ${esc(sql.name)}</span><button class="chip" data-act="bk-forget-sql">${t("不再用")}</button>` : folder.supported ? `<button class="chip" data-act="bk-pick-sql">${t("选 supabase 文件夹")}</button>` : `<span class="small muted">${t("在电脑上打开这一页可以设置自动拷贝")}</span>`}</span></div>`;
  const cards = [
    card("cloud", "☁", t("家庭云端"), fam ? t("家庭自己的 Supabase 存储，全家任何设备都能恢复；只留 {n} 天", { n: KEEP_DAYS }) : t("加入家庭后可用"), "", !fam),
    card("gdrive", "▲", "Google Drive", gdConfigured() ? t("放在你 Google 云端硬盘的「小月亮备份」文件夹里；只留 {n} 天", { n: KEEP_DAYS }) : notCfg,
      !gdConfigured() ? "" : pathRow("gdPath", t("Drive 里的文件夹路径"), s.gdPath, "小月亮备份") + (gd ? `<span class="small muted">${t("已连接")}${gd.email ? ` ${esc(gd.email)}` : ""} · ${esc(DR.gdPathText())}</span> <button class="chip" data-act="bk-gd-off">${t("断开")}</button>` : `<button class="chip" data-act="bk-gd-on">${t("连接 Google Drive")}</button>`), !gdConfigured() || !gd),
    card("dropbox", "◆", "Dropbox", dbxConfigured() ? t("放在 Dropbox 的「应用 / 小月亮」文件夹里；只留 {n} 天", { n: KEEP_DAYS }) : notCfg,
      !dbxConfigured() ? "" : pathRow("dbxPath", t("应用文件夹里的子路径"), s.dbxPath, t("留空 = 直接放应用文件夹")) + (dbx ? `<span class="small muted">${t("已连接")}${dbx.email ? ` ${esc(dbx.email)}` : ""}</span> <button class="chip" data-act="bk-dbx-off">${t("断开")}</button>` : `<button class="chip" data-act="bk-dbx-on">${t("连接 Dropbox")}</button>`), !dbxConfigured() || !dbx),
    card("folder", "▭", t("这台电脑的文件夹"), t("桌面 Chrome / Edge。选 iCloud Drive、OneDrive 或 Dropbox 同步的文件夹，就等于也上了云；自动清掉 {n} 天前的", { n: KEEP_DAYS }), folderFull, !folder.supported),
    card("download", "⤓", t("下载"), t("每次备份弹出下载。iPhone 上可以分享到「文件」存进 iCloud Drive；下载的文件不会自动清理")),
  ].join("");
  const backup = `<h2>${t("备份")}</h2>
    ${S.backupPending ? `<div class="bk-notice"><b>${t("定时备份在等你点一下")}</b> ${t("写入文件夹或 Google Drive 需要你授权一次。")} <button class="btn" data-act="bk-now">${t("继续备份")}</button></div>` : ""}
    ${UI.result ? `<div class="bk-notice"><b>${esc(UI.result.title)}</b>${UI.result.detail ? `<p class="small muted">${esc(UI.result.detail)}</p>` : ""}</div>` : ""}
    <div class="panel">
      <div class="bkhead"><div><b>${s.last ? esc(t("上次备份 {d}", { d: when(s.last) })) : t("还没备份过")}</b><small class="muted">${s.last && s.lastInfo ? esc(s.lastInfo) + " · " : ""}${!intervalDays(s) ? t("定时备份已关") : due && due.getTime() <= Date.now() ? t("已到期：下次打开应用时自动备份") : esc(t("下次 {d}", { d: when(due.toISOString()) }))}</small></div>
        <div class="btns" style="margin:0"><button class="btn primary" data-act="bk-now">${t("现在备份")}</button><button class="btn" data-act="bk-download">${t("只下载一份")}</button></div></div>
      <form id="backupForm" onsubmit="return false">
        <div class="sched"><label>${t("多久备份一次")} <select name="every">${[["off", "不自动备份"], ["week", "每周"], ["month", "每月"], ["custom", "自定义（天）"]].map(([v, l]) => `<option value="${v}" ${s.every === v ? "selected" : ""}>${t(l)}</option>`).join("")}</select></label>
          <label ${s.every === "custom" ? "" : "hidden"} data-bk-days>${t("每隔几天")} <input name="days" type="number" min="1" max="365" inputmode="numeric" value="${s.days}"></label></div>
        <p class="small muted">${t("网页没法在关着的时候跑：到期后下次打开应用时自动备份一次")}</p>
        <div class="lab">${t("备份到哪（可多选）")}</div>
        <div class="tgrid">${cards}</div>
        ${sqlBlock}
      </form></div>`;
  // 3) 已有的备份（按来源切换）
  const srcs = available(); let have = "";
  if (srcs.length) {
    UI.src = srcs.includes(UI.src) ? UI.src : srcs[0]; const list = UI.lists[UI.src] || [], S0 = SOURCES[UI.src];
    const row = (f) => `<div class="bkrow"><div class="bkname"><b>${esc(f.name)}</b><small class="muted">${esc(when(f.at))} · ${kb(f.size)}</small></div>
      <div class="bkact"><button class="chip" data-act="bk-dl" data-src="${UI.src}" data-id="${esc(f.id || f.name)}" data-name="${esc(f.name)}">${t("下载")}</button><button class="chip" data-act="bk-use" data-src="${UI.src}" data-id="${esc(f.id || f.name)}">${t("恢复")}</button><button class="chip danger" data-act="bk-rm" data-src="${UI.src}" data-id="${esc(f.id || f.name)}" data-name="${esc(f.name)}" aria-label="${t("删除")}">✕</button></div></div>`;
    have = `<h2>${t("已有的备份")}</h2><div class="panel">
      ${srcs.length > 1 ? `<div class="seg" role="group" aria-label="${t("备份来源")}">${srcs.map((k) => `<button type="button" data-act="bk-src" data-src="${k}" aria-pressed="${k === UI.src}">${SOURCES[k].icon} ${t(SOURCES[k].label)}</button>`).join("")}</div>` : `<div class="lab">${S0.icon} ${t(S0.label)}</div>`}
      <div class="bklist">${UI.loading ? `<p class="small muted">${t("读取中…")}</p>` : list.length ? list.slice(0, 12).map(row).join("") : `<p class="small muted">${t("这里还没有备份。上面勾上它，再点「现在备份」。")}</p>`}</div></div>`;
  }
  // 4) 从文件恢复
  const pv = UI.preview;
  const preview = !pv ? "" : pv.ok ? `<div class="bk-notice"><b>${t("备份来自 {h}，{d}，共 {n} 条记录", { h: esc(pv.scope || t("这台设备")), d: when(pv.exported_at), n: pv.rows })}</b>${pv.kids.length ? `<p class="small muted">${t("孩子：{k}", { k: esc(pv.kids.join("、")) })}</p>` : ""}
      ${pv.same ? "" : `<p class="small muted">${t("这是另一个家庭的备份（换了项目或重建过家庭时正常）：会合并进现在这个家庭。")}</p>`}
      <p class="small">${t("恢复 = 把备份里的记录合并进来：已有同 id 的不动，缺的补上；设置（孩子、用药间隔等）合并。家庭模式下会同步给全家。")}</p>
      <div class="btns"><button class="btn primary" data-act="bk-restore">${t("合并进来")}</button><button class="btn" data-act="bk-cancel">${t("取消")}</button></div></div>`
    : `<div class="bk-notice"><b>${t("不能恢复：{why}", { why: esc(pv.why) })}</b> <button class="chip" data-act="bk-cancel">${t("关闭")}</button></div>`;
  const restore = `<h2>${t("从文件恢复")}</h2><div class="panel"><p class="small muted" style="margin-top:0">${t("换了手机、数据库被删、或换了 Supabase 项目：先登录并建好 / 加入家庭（新项目要先在 SQL Editor 执行 supabase/schema.sql），再选备份文件合并进来。老版本「导出备份」的文件也行。")}</p>
      <div class="btns" style="margin-top:8px"><label class="btn">${t("选文件")}<input id="backupFile" type="file" accept="application/json,.json" hidden></label></div>${preview}</div>`;
  // 5) 数据工具（折叠）
  const tools = `<details class="more"><summary>${t("数据工具")}<span class="small muted">${t("导出表格、演示数据、清空")}</span></summary>
    <div class="panel"><div class="btns" style="margin-top:0"><button class="btn" data-act="csv">${t("导出表格（CSV）")}</button></div>
    <div class="btns"><button class="btn" data-act="demo">${t("载入演示数据")}</button><button class="btn" data-act="cleardemo">${t("清除演示数据")}</button><button class="btn danger" data-act="clearall">${t("清空全部记录")}</button></div></div></details>`;
  return `<h2>${t("同步、备份与恢复")}</h2>${status}${backup}${have}${restore}${tools}`;
}
async function bkAct(act, el) {
  const redraw = () => { UI.stale = true; refreshSettingsIfOpen(); };
  switch (act) {
    case "bk-now": case "bk-download": {
      el.disabled = true;
      try { const r = await runBackup(act === "bk-download" ? ["download"] : (settings().targets.length ? settings().targets : ["download"]), true); S.backupPending = r.needGesture;
        const sqlNote = r.sqlN ? t("已顺带拷贝 {n} 个 SQL 文件。", { n: r.sqlN }) : t("提醒：数据库脚本（supabase/*.sql）不在备份里，请手动把它拷到云盘或别的位置。");
        UI.result = r.ok.length ? { title: t("已备份到 {to}：{name}（{n} 条）", { to: r.ok.map(targetName).join("、"), name: r.name, n: r.rows }), detail: [sqlNote, ...r.failed.map(([k, w]) => `${targetName(k)}：${w}`)].join("；") } : { title: t("备份没成功"), detail: r.failed.map(([k, w]) => `${targetName(k)}：${w}`).join("；") }; }
      catch (e) { UI.result = { title: t("备份没成功"), detail: e.message }; }
      redraw(); break; }
    case "bk-pick-sql": try { await pickSqlFolder(); toast(t("以后每次写文件夹时会把 .sql 一起拷进 sql/ 子目录")); } catch (e) { if (e.name !== "AbortError") toast(t("选文件夹失败：{msg}", { msg: e.message })); } redraw(); break;
    case "bk-forget-sql": await forgetSqlFolder(); redraw(); break;
    case "bk-pick": try { await pickFolder(); toast(t("已记住这个文件夹")); } catch (e) { if (e.name !== "AbortError") toast(t("选文件夹失败：{msg}", { msg: e.message })); } redraw(); break;
    case "bk-forget": await forgetFolder(); redraw(); break;
    case "bk-grant": { const st = await folderStatus(); if (st.handle) { try { await st.handle.requestPermission({ mode: "readwrite" }); } catch (e) { /* 取消 */ } } redraw(); break; }
    case "bk-src": UI.src = el.dataset.src; refreshSettingsIfOpen(); break;
    case "bk-dl": try { const d = await SOURCES[el.dataset.src].read(el.dataset.id); download(toBlob(d), el.dataset.name); } catch (e) { toast(t("下载失败：{msg}", { msg: e.message })); } break;
    case "bk-use": try { const d = await SOURCES[el.dataset.src].read(el.dataset.id); UI.preview = { ...inspect(d), data: d }; } catch (e) { toast(t("读取失败：{msg}", { msg: e.message })); } refreshSettingsIfOpen(); break;
    case "bk-rm": if (!confirm(t("删除备份 {n}？", { n: el.dataset.name }))) break; try { await SOURCES[el.dataset.src].del(el.dataset.id); } catch (e) { toast(t("删除失败：{msg}", { msg: e.message })); } redraw(); break;
    case "bk-gd-on": el.disabled = true; try { await gdConnect(); saveSettings({ targets: [...new Set([...settings().targets, "gdrive"])] }); toast(t("已连接 Google Drive")); } catch (e) { toast(t("连接 Google Drive 失败：{msg}", { msg: e.message })); } redraw(); break;
    case "bk-gd-off": gdDisconnect(); saveSettings({ targets: settings().targets.filter((x) => x !== "gdrive") }); redraw(); break;
    case "bk-dbx-on": try { await dbxConnect(); } catch (e) { toast(t("连接 Dropbox 失败：{msg}", { msg: e.message })); } break;
    case "bk-dbx-off": await dbxDisconnect(); saveSettings({ targets: settings().targets.filter((x) => x !== "dropbox") }); redraw(); break;
    case "bk-cancel": UI.preview = null; refreshSettingsIfOpen(); break;
    case "bk-restore": {
      const pv = UI.preview; if (!pv?.ok) break;
      if (!confirm(t("把备份（{d}，{n} 条）合并进来？已有同 id 的记录不动，缺的补上。", { d: String(pv.exported_at).slice(0, 16).replace("T", " "), n: pv.rows }))) break;
      el.disabled = true; el.textContent = t("恢复中…");
      try { const before = S.entries.length; await importJSON(pv.data); UI.result = { title: t("已合并，补上 {n} 条记录", { n: S.entries.length - before }), detail: "" }; UI.preview = null; }
      catch (e) { UI.result = { title: t("恢复失败"), detail: e.message }; }
      refreshSettingsIfOpen(); break; }
    default: return false;
  }
  return true;
}
async function bkChange(ev) {
  const el = ev.target;
  if (el.closest && el.closest("#backupForm")) {
    const f = el.closest("#backupForm"), targets = [...f.querySelectorAll('input[name="target"]:checked')].map((x) => x.value);
    saveSettings({ every: f.elements.every.value, days: Math.max(1, +f.elements.days.value || 14), targets, provider: f.elements.provider?.value || "any", gdPath: (f.elements.gdPath?.value || "").trim(), dbxPath: (f.elements.dbxPath?.value || "").trim() });
    const box = f.querySelector("[data-bk-days]"); if (box) box.hidden = f.elements.every.value !== "custom";
    if (el.name === "every" || el.name === "provider") refreshSettingsIfOpen();
    if (el.name === "gdPath" || el.name === "dbxPath") { UI.stale = true; refreshSettingsIfOpen(); }   // 路径改了：列表换到新文件夹
    return true;
  }
  if (el.id === "backupFile") {
    const file = el.files?.[0]; if (!file) return true;
    try { const d = JSON.parse(await file.text()); UI.preview = { ...inspect(d), data: d }; } catch (e) { UI.preview = { ok: false, why: t("不是有效的 JSON 文件") }; }
    el.value = ""; refreshSettingsIfOpen(); return true;
  }
  return false;
}

export { syncHTML, backupSummary, initProviders, bkAct, bkChange, runScheduled };
