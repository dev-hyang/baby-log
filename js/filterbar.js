import { t } from "./i18n.js";
import { esc } from "./util.js";

/* ============ 筛选条（11-15，照爱家小助手 home-pantry 的样子，各页同一套） ============
   一行：搜索框（占满剩下的宽度）→ 几个下拉（第一项是默认，通常是「全部…」）→ 排序下拉 → ✕ 清除筛选（和默认不同时才出现）。
   手机（≤440px）上 js/compact-filters.js（爱家小助手 shared/ 同一份，原样拷过来）把下拉收成「筛选 (n)」按钮，点开浮在列表上；
   这一行滑动时固定在路径条下面。排序不算筛选：不计入 n，「清除筛选」也不动它。
   用法：
     fbarHTML(key, { q: { value, ph }, selects: [{ k, label, opts: [[值, 名字]], v, def? }], sort: { opts, v }, changed })
     （def：默认值不是第一项时填，「筛选 (n)」的计数才对）
     onFbar(key, { set(k, v) { 改状态并重画 }, clear() { 恢复默认并重画 } })
   搜索框打字防抖 250ms 再 set("q")；整页重画后焦点和光标放回搜索框，接着打字不断。 */
const H = new Map();
export const onFbar = (key, h) => { H.set(key, h); };

export function fbarHTML(key, { q = null, selects = [], sort = null, changed = false } = {}){
  const sel = (k, label, opts, v, isSort, def) => `<select data-fb="${esc(key)}" data-fk="${k}"${isSort ? ' name="sort"' : ""}${def != null ? ` data-default="${esc(def)}"` : ""} aria-label="${esc(label)}" title="${esc(label)}">${opts.map(([ov, ol]) => `<option value="${esc(ov)}"${String(ov) === String(v) ? " selected" : ""}>${esc(ol)}</option>`).join("")}</select>`;
  return `<div class="toolbar" data-fbar="${esc(key)}">${q ? `<input type="search" data-fb="${esc(key)}" data-fk="q" value="${esc(q.value || "")}" placeholder="${esc(q.ph || t("搜索"))}" aria-label="${esc(q.ph || t("搜索"))}" enterkeyhint="search" autocomplete="off">` : ""}${selects.filter(Boolean).map(s => sel(s.k, s.label, s.opts, s.v, false, s.def)).join("")}${sort ? sel("sort", sort.label || t("排序"), sort.opts, sort.v, true) : ""}<button type="button" class="clear-filters" data-fb-clear="${esc(key)}"${changed ? "" : " hidden"}><span aria-hidden="true">✕ </span>${t("清除筛选")}</button></div>`;
}
/** 只重画列表、不重画筛选条的页面（经文卡库）：自己更新「清除筛选」的显隐 */
export const showClear = (key, on) => document.querySelectorAll(`[data-fb-clear="${key}"]`).forEach(b => { b.hidden = !on; });
/** 搜索：q 为空 = 不筛；否则任一段文字里含有（不分大小写） */
export const hit = (q, ...parts) => { const s = String(q || "").trim().toLowerCase(); return !s || parts.filter(Boolean).join(" ").toLowerCase().includes(s); };
/** 现在的筛选和默认值是否不同（只比 def 里的键） */
export const differs = (cur, def) => Object.keys(def).some(k => String(cur[k] ?? "") !== String(def[k] ?? ""));

document.addEventListener("change", e => {
  const el = e.target; if (!el.matches || !el.matches("select[data-fb]")) return;
  const h = H.get(el.dataset.fb); if (h) h.set(el.dataset.fk, el.value);
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

/* 手机上点开「筛选」：下拉面板是浮在列表上的，筛选条在屏幕下方时面板会伸到底部页签下面、点不到。点开后如果被盖住，就把页面往上推一点 */
document.addEventListener("click", ev => {
  const b = ev.target.closest && ev.target.closest(".tb-toggle"); if (!b) return;
  requestAnimationFrame(() => {
    const p = document.getElementById(b.getAttribute("aria-controls")); if (!p) return;
    p.classList.remove("tb-up");
    if (!p.classList.contains("open")) return;
    const nav = document.querySelector("nav.tabs"), limit = nav ? nav.getBoundingClientRect().top : window.innerHeight, over = p.getBoundingClientRect().bottom - limit + 12;
    if (over <= 0) return;
    const room = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;   // 页面还能往上推多少
    if (room >= over) window.scrollBy({ top: over, behavior: "smooth" }); else p.classList.add("tb-up");   // 已经到页面底了：面板改成向上展开
  });
});
