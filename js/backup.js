/* ============ 备份与恢复 ============
   小月亮是本机优先：全部记录和设置都在内存 / 本机里（家庭模式下再同步到云端），所以备份 = 现在这台设备上的 settings + entries（不含演示数据）。
   手动下载；或按周 / 按月 / 自定义天数定时备份到：云端（家庭模式；Supabase Storage 的 backups 桶，路径 family/<家庭id>/…，迁移 017）、
   这台电脑的文件夹（File System Access，桌面 Chrome / Edge）、或下载。云端和文件夹只留 60 天。网页没法在关着时跑：到期后下次打开应用时在后台做一次。
   恢复 = 把备份里的记录合并进来（已有同 id 的不动，缺的补上；设置合并），家庭模式下会同步给全家。老版本「导出备份」的文件也能恢复。 */
import { S, APP_VERSION } from "./state.js";
import { SB, loadJSON, saveJSON } from "./sync.js";
import { importJSON } from "./store.js";
import { $, esc, toast } from "./util.js";
import { t } from "./i18n.js";
import { refreshSettingsIfOpen } from "./me.js";

const CFG = { app: "xiaoyueliang", title: "小月亮", key: "xiaoyueliang.backup", file: "xiaoyueliang" };
const KEEP_DAYS = 60, FORMAT = 2;
const FILE_RE = new RegExp(`^${CFG.file}-(\\d{4}-\\d{2}-\\d{2})-\\d{4}\\.json$`);
const cloudReady = () => S.mode === "family" && !!(SB.family && SB.client);
const prefix = () => `family/${SB.family.id}`;

/* ---- 设置（存本机） ---- */
const DEFAULTS = { every: "off", days: 14, targets: ["download"], last: null, lastInfo: "" };
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

/* ---- 跑一次备份 ---- */
const targetName = (k) => ({ download: t("下载"), folder: t("文件夹"), cloud: t("云端") }[k] || k);
async function runBackup(targets, gesture = false) {
  const data = collect(), blob = toBlob(data), name = fileName(), ok = [], failed = []; let needGesture = false;
  for (const tg of targets) {
    try {
      if (tg === "download") download(blob, name); else if (tg === "folder") await writeFolder(blob, name, gesture); else if (tg === "cloud") await writeCloud(blob, name); else continue;
      ok.push(tg);
    } catch (e) { if (e.message === "NEED_GESTURE") needGesture = true; failed.push([tg, e.message === "NO_FOLDER" ? t("还没选文件夹") : e.message === "NEED_GESTURE" ? t("需要你点一下授权") : e.message]); }
  }
  if (ok.length) saveSettings({ last: new Date().toISOString(), lastInfo: `${name} · ${ok.map(targetName).join("+")} · ${rowCount(data)} ${t("条")}` });
  return { ok, failed, needGesture, name, rows: rowCount(data) };
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
    if (r.needGesture) toast(t("定时备份要写进文件夹，去 我的 → 设置 → 备份与恢复 点一下「继续备份」"));
  } catch (e) { console.error(e); }
}

/* ---- 恢复 ---- */
function inspect(d) {
  if (!d || d.app !== CFG.app) return { ok: false, why: t("这不是小月亮的备份文件") };
  if (!Array.isArray(d.entries)) return { ok: false, why: t("文件里没有记录") };
  const kids = (d.settings?.children || []).map((c) => c.name).filter(Boolean);
  return { ok: true, exported_at: d.exported_at || (d.exported ? new Date(d.exported).toISOString() : ""), scope: d.family?.name || "", rows: d.entries.length, kids, same: !d.family?.id || !SB.family || d.family.id === SB.family.id };
}

/* ---- 界面：设置页里的一块（me.js 的 settingsHTML 调 backupHTML；改动后 refreshSettingsIfOpen 重画） ---- */
const UI = { folder: null, cloud: [], loading: false, stale: true, preview: null, result: null };
const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");
const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
function backupHTML() {
  if (UI.stale) { UI.stale = false; UI.loading = true; Promise.all([folderStatus().catch(() => ({ supported: false, perm: "none", name: "" })), listCloud().catch(() => [])]).then(([f, c]) => { UI.folder = f; UI.cloud = c; UI.loading = false; refreshSettingsIfOpen(); }); }
  const s = settings(), folder = UI.folder || { supported: folderSupported(), perm: "none", name: "" }, has = (k) => s.targets.includes(k), due = nextDue(s);
  const chk = (k, label, desc, extra = "") => `<label class="chk"><input type="checkbox" name="target" value="${k}" ${has(k) ? "checked" : ""}> <b>${label}</b> <span class="small muted">· ${desc}</span></label>${extra}`;
  const folderLine = !folder.supported ? `<p class="small muted">${t("这个浏览器不支持直接写文件夹（手机和 Safari 没有）；用「下载」或云端")}</p>`
    : folder.name ? `<p class="small muted">${t("文件夹：{n}", { n: esc(folder.name) })}${folder.perm !== "granted" ? ` · <b>${t("需要点一下授权")}</b> <button class="chip" data-act="bk-grant">${t("授权")}</button>` : ""} <button class="chip" data-act="bk-pick">${t("换文件夹")}</button> <button class="chip" data-act="bk-forget">${t("不再用")}</button></p>`
    : `<p class="small muted"><button class="chip" data-act="bk-pick">${t("选一个文件夹")}</button> ${t("选一次就记住，以后自动写进去；放在 OneDrive / iCloud 同步的文件夹里就等于也上了云")}</p>`;
  const pv = UI.preview;
  const preview = !pv ? "" : pv.ok ? `<div class="bk-notice"><b>${t("备份来自 {h}，{d}，共 {n} 条记录", { h: esc(pv.scope || t("这台设备")), d: when(pv.exported_at), n: pv.rows })}</b>${pv.kids.length ? `<p class="small muted">${t("孩子：{k}", { k: esc(pv.kids.join("、")) })}</p>` : ""}
      ${pv.same ? "" : `<p class="small muted">${t("这是另一个家庭的备份（换了项目或重建过家庭时正常）：会合并进现在这个家庭。")}</p>`}
      <p class="small">${t("恢复 = 把备份里的记录合并进来：已有同 id 的不动，缺的补上；设置（孩子、用药间隔等）合并。家庭模式下会同步给全家。")}</p>
      <div class="btns"><button class="btn primary" data-act="bk-restore">${t("合并进来")}</button><button class="btn" data-act="bk-cancel">${t("取消")}</button></div></div>`
    : `<div class="bk-notice"><b>${t("不能恢复：{why}", { why: esc(pv.why) })}</b> <button class="chip" data-act="bk-cancel">${t("关闭")}</button></div>`;
  return `<h2>${t("备份与恢复")}</h2>
    ${S.backupPending ? `<div class="bk-notice"><b>${t("定时备份在等你点一下")}</b> ${t("写入这台电脑的文件夹需要你授权一次。")} <button class="btn" data-act="bk-now">${t("继续备份")}</button></div>` : ""}
    ${UI.result ? `<div class="bk-notice"><b>${esc(UI.result.title)}</b>${UI.result.detail ? `<p class="small muted">${esc(UI.result.detail)}</p>` : ""}</div>` : ""}
    <div class="panel"><p class="small muted">${s.last ? esc(t("上次备份 {d}（{info}）", { d: when(s.last), info: s.lastInfo || "" })) : t("还没备份过")}<br>${!intervalDays(s) ? t("定时备份已关") : due && due.getTime() <= Date.now() ? t("已到期：下次打开应用时自动备份") : esc(t("下次 {d}", { d: when(due.toISOString()) }))}</p>
      <div class="btns" style="margin-top:8px"><button class="btn primary" data-act="bk-now">${t("现在备份")}</button><button class="btn" data-act="bk-download">${t("只下载一份")}</button></div>
      <form id="backupForm" onsubmit="return false" style="margin-top:12px">
        <div class="lab">${t("多久备份一次")}</div>
        <select name="every">${[["off", "关闭"], ["week", "每周"], ["month", "每月"], ["custom", "自定义（天）"]].map(([v, l]) => `<option value="${v}" ${s.every === v ? "selected" : ""}>${t(l)}</option>`).join("")}</select>
        <div ${s.every === "custom" ? "" : "hidden"} data-bk-days><div class="lab">${t("每隔几天")}</div><input name="days" type="number" min="1" max="365" inputmode="numeric" value="${s.days}"></div>
        <p class="small muted">${t("网页没法在关着的时候跑：到期后下次打开应用时自动备份一次")}</p>
        <div class="lab">${t("备份到哪（可多选）")}</div>
        ${S.mode === "family" ? chk("cloud", t("云端"), t("家庭自己的 Supabase 存储，全家任何设备都能恢复，只留 {n} 天；需要迁移 017", { n: KEEP_DAYS })) : ""}
        ${chk("folder", t("这台电脑的文件夹"), t("无需每次确认，自动清掉 {n} 天前的", { n: KEEP_DAYS }), folderLine)}
        ${chk("download", t("下载"), t("每次备份弹出下载；浏览器下载的文件不会自动清理"))}
      </form></div>
    ${S.mode === "family" ? `<div class="panel"><div class="lab">${t("云端备份")}</div>${UI.loading ? `<p class="small muted">${t("读取中…")}</p>` : UI.cloud.length ? UI.cloud.slice(0, 12).map((f) => `<div class="medrow"><div><b>${esc(f.name)}</b><br><span class="small muted">${esc(when(f.at))} · ${kb(f.size)}</span></div><span><button class="chip" data-act="bk-cloud-dl" data-name="${esc(f.name)}">${t("下载")}</button> <button class="chip" data-act="bk-cloud-restore" data-name="${esc(f.name)}">${t("恢复")}</button> <button class="chip" data-act="bk-cloud-del" data-name="${esc(f.name)}">✕</button></span></div>`).join("") : `<p class="small muted">${t("还没有云端备份。勾上「云端」再点「现在备份」。")}</p>`}</div>` : ""}
    <div class="panel"><div class="lab">${t("从备份恢复")}</div><p class="small muted">${t("换了手机、数据库被删、或换了 Supabase 项目：先登录并建好 / 加入家庭（新项目要先在 SQL Editor 执行 supabase/schema.sql），再选备份文件合并进来。老版本「导出备份」的文件也行。")}</p>
      <div class="btns" style="margin-top:8px"><label class="btn">${t("选文件")}<input id="backupFile" type="file" accept="application/json,.json" hidden></label></div>${preview}</div>`;
}
async function bkAct(act, el) {
  const redraw = () => { UI.stale = true; refreshSettingsIfOpen(); };
  switch (act) {
    case "bk-now": case "bk-download": {
      el.disabled = true;
      try { const r = await runBackup(act === "bk-download" ? ["download"] : (settings().targets.length ? settings().targets : ["download"]), true); S.backupPending = r.needGesture;
        UI.result = r.ok.length ? { title: t("已备份到 {to}：{name}（{n} 条）", { to: r.ok.map(targetName).join("、"), name: r.name, n: r.rows }), detail: r.failed.map(([k, w]) => `${targetName(k)}：${w}`).join("；") } : { title: t("备份没成功"), detail: r.failed.map(([k, w]) => `${targetName(k)}：${w}`).join("；") }; }
      catch (e) { UI.result = { title: t("备份没成功"), detail: e.message }; }
      redraw(); break; }
    case "bk-pick": try { await pickFolder(); toast(t("已记住这个文件夹")); } catch (e) { if (e.name !== "AbortError") toast(t("选文件夹失败：{msg}", { msg: e.message })); } redraw(); break;
    case "bk-forget": await forgetFolder(); redraw(); break;
    case "bk-grant": { const st = await folderStatus(); if (st.handle) { try { await st.handle.requestPermission({ mode: "readwrite" }); } catch (e) { /* 取消 */ } } redraw(); break; }
    case "bk-cloud-dl": try { const d = await readCloud(el.dataset.name); download(toBlob(d), el.dataset.name); } catch (e) { toast(t("下载失败：{msg}", { msg: e.message })); } break;
    case "bk-cloud-restore": try { const d = await readCloud(el.dataset.name); UI.preview = { ...inspect(d), data: d }; } catch (e) { toast(t("读取失败：{msg}", { msg: e.message })); } refreshSettingsIfOpen(); break;
    case "bk-cloud-del": if (!confirm(t("删除云端备份 {n}？", { n: el.dataset.name }))) break; try { await deleteCloud(el.dataset.name); } catch (e) { toast(t("删除失败：{msg}", { msg: e.message })); } redraw(); break;
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
    saveSettings({ every: f.elements.every.value, days: Math.max(1, +f.elements.days.value || 14), targets });
    const box = f.querySelector("[data-bk-days]"); if (box) box.hidden = f.elements.every.value !== "custom";
    if (el.name === "every") refreshSettingsIfOpen();
    return true;
  }
  if (el.id === "backupFile") {
    const file = el.files?.[0]; if (!file) return true;
    try { const d = JSON.parse(await file.text()); UI.preview = { ...inspect(d), data: d }; } catch (e) { UI.preview = { ok: false, why: t("不是有效的 JSON 文件") }; }
    el.value = ""; refreshSettingsIfOpen(); return true;
  }
  return false;
}

export { backupHTML, bkAct, bkChange, runScheduled };
