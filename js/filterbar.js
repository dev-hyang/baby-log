import { t } from "./i18n.js";
import { esc } from "./util.js";

/* ============ 筛选条（和爱家小助手 / 牧羊人同一套，各页一样，手机电脑都一样）============
   一行：搜索框（占满剩下的宽度）→ 「筛选 (n)」按钮 → ✕ 清除筛选（和默认不同时才出现）。
   点「筛选」弹出面板，每个下拉一行（左边名字、右边下拉）；n = 和默认不同的下拉个数，排序（k = "sort"）不算筛选、不计入 n。
   面板开着时，选了下拉页面照常重画，面板保持展开；点面板外 / Esc / 「完成」收起。手机上这一行滑动时固定在路径栏下面。
   用法：
     fbarHTML(key, { q: { value, ph }, selects: [{ k, label, opts: [[值, 名字]], v, def? }], sort: { opts, v }, changed })
     （def：默认值不是第一项时填，「筛选 (n)」的计数才对）
     onFbar(key, { set(k, v) { 改状态并重画 }, clear() { 恢复默认并重画 } })
   搜索框打字防抖 250ms 再 set("q")；整页重画后焦点和光标放回搜索框，接着打字不断。 */
const H = new Map();
export const onFbar = (key, h) => { H.set(key, h); };
let OPEN = null;   // 哪条筛选条的面板开着（重画后保持）
const ICON = `<svg class="fb-ico" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M2 6h16M2 14h16"/><circle cx="7" cy="6" r="2.2" fill="var(--surface)"/><circle cx="13" cy="14" r="2.2" fill="var(--surface)"/></svg>`;

export function fbarHTML(key, { q = null, selects = [], sort = null, changed = false } = {}){
  const k0 = esc(key), rows = [...selects.filter(Boolean).map(s => ({ ...s, sort: false })), ...(sort ? [{ k: "sort", label: sort.label || t("排序"), opts: sort.opts, v: sort.v, sort: true }] : [])];
  const n = rows.filter(r => !r.sort && String(r.v) !== String(r.def != null ? r.def : r.opts[0][0])).length;
  const open = OPEN === key;
  const field = (r, i) => `<div class="fb-field"><label class="fb-lab" for="fb-${k0}-${i}">${esc(r.label)}</label><select id="fb-${k0}-${i}" data-fb="${k0}" data-fk="${esc(r.k)}"${r.sort ? ' name="sort"' : ""} data-nosearch>${r.opts.map(([ov, ol]) => `<option value="${esc(ov)}"${String(ov) === String(r.v) ? " selected" : ""}>${esc(ol)}</option>`).join("")}</select></div>`;
  const pop = rows.length ? `<div class="fb-pop" id="fb-pop-${k0}"${open ? "" : " hidden"} role="group" aria-label="${esc(t("筛选"))}"><div class="fb-head"><b>${t("筛选")}</b></div>${rows.map(field).join("")}<div class="fb-foot"><button type="button" class="ui-btn" data-size="sm" data-fb-close="${k0}">${t("完成")}</button></div></div>` : "";
  const btn = rows.length ? `<button type="button" class="fb-btn${n ? " on" : ""}" data-fb-pop="${k0}" aria-expanded="${open}" aria-controls="fb-pop-${k0}">${ICON}<span>${t("筛选")}</span>${n ? `<b class="fb-n">${n}</b>` : ""}</button>` : "";
  return `<div class="fb-bar" data-fbar="${k0}">${q ? `<input type="search" data-fb="${k0}" data-fk="q" value="${esc(q.value || "")}" placeholder="${esc(q.ph || t("搜索"))}" aria-label="${esc(q.ph || t("搜索"))}" enterkeyhint="search" autocomplete="off">` : ""}${btn}<button type="button" class="clear-filters" data-fb-clear="${k0}"${changed ? "" : " hidden"}><span aria-hidden="true">✕ </span>${t("清除筛选")}</button>${pop}</div>`;
}
/** 只重画列表、不重画筛选条的页面（经文卡库）：自己更新「清除筛选」的显隐 */
export const showClear = (key, on) => document.querySelectorAll(`[data-fb-clear="${key}"]`).forEach(b => { b.hidden = !on; });
/** 搜索：q 为空 = 不筛；否则任一段文字里含有（不分大小写） */
export const hit = (q, ...parts) => { const s = String(q || "").trim().toLowerCase(); return !s || parts.filter(Boolean).join(" ").toLowerCase().includes(s); };
/** 现在的筛选和默认值是否不同（只比 def 里的键） */
export const differs = (cur, def) => Object.keys(def).some(k => String(cur[k] ?? "") !== String(def[k] ?? ""));

document.addEventListener("change", e => {
  const el = e.target; if (!el.matches || !el.matches("select[data-fb]")) return;
  const h = H.get(el.dataset.fb); if (!h) return;
  const { fb, fk } = el.dataset; OPEN = fb; h.set(fk, el.value);
  requestAnimationFrame(() => document.querySelector(`select[data-fb="${CSS.escape(fb)}"][data-fk="${CSS.escape(fk)}"]`)?.focus({ preventScroll: true }));   // 重画后焦点放回刚改的下拉
});
let timer = 0;
document.addEventListener("input", e => {
  const el = e.target; if (!el.matches || !el.matches("input[data-fb]")) return;
  const key = el.dataset.fb;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const h = H.get(key); if (!h) return;
    const pos = el.selectionStart;
    h.set("q", el.value);
    const n = document.querySelector(`input[data-fb="${CSS.escape(key)}"]`);
    if (n && n !== document.activeElement) { n.focus({ preventScroll: true }); try { n.setSelectionRange(pos, pos); } catch (err) { /* 忽略 */ } }
  }, 250);
});
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-fb-clear]"); if (!b) return;
  const key = b.dataset.fbClear, h = H.get(key); if (!h) return;
  e.preventDefault(); e.stopPropagation();
  h.clear();
  // 清除后按钮消失：焦点放到这一条的第一个输入框，不丢到页面顶上
  requestAnimationFrame(() => { const f = document.querySelector(`[data-fbar="${CSS.escape(key)}"] input, [data-fbar="${CSS.escape(key)}"] select`); if (f) f.focus({ preventScroll: true }); });
}, true);

/* 点「筛选」开合面板（不重画）；点面板外 / Esc / 「完成」收起 */
function setPop(key){
  OPEN = key;
  document.querySelectorAll(".fb-pop").forEach(p => { p.hidden = p.id !== "fb-pop-" + key; });
  document.querySelectorAll(".fb-btn").forEach(b => b.setAttribute("aria-expanded", String(b.dataset.fbPop === key)));
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-fb-pop]"), c = e.target.closest && e.target.closest("[data-fb-close]");
  if (b) { setPop(OPEN === b.dataset.fbPop ? null : b.dataset.fbPop); return; }
  if (c) { setPop(null); document.querySelector(`[data-fb-pop="${CSS.escape(c.dataset.fbClose)}"]`)?.focus(); return; }
  if (OPEN && !e.target.closest(".fb-pop")) setPop(null);
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && OPEN) { const k = OPEN; setPop(null); document.querySelector(`[data-fb-pop="${CSS.escape(k)}"]`)?.focus(); } });
