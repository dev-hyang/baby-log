/* ============ boot ============
   Entry module. Module order: i18n → util → units → state → types → derived → store/sync → views/meal/trend → sheet → events.
   Cross-module calls happen only inside functions, so the import cycles (store ↔ sync ↔ views) are safe. */
import { initHeroCycle, markHeroDash } from "./herocycle.js";
import "./events.js"; // registers the global click / change / input handlers
import { applyLang } from "./i18n.js";
import { S, loadLocal } from "./state.js";
import { initCloud } from "./store.js";
import { initProviders, runScheduled } from "./backup.js";
import { initSupabase, syncNow } from "./sync.js";
import { $ } from "./util.js";
import { heroHTML, heroPage, heroRestore, heroSettle, render } from "./views.js";

applyLang(); loadLocal(); render();
initProviders();   // 从 Dropbox 授权页跳回来时把 ?code= 换成令牌（js/backup.js）
setInterval(() => { if (S.tab === "today" && !$("#sheet").open) { const h = document.querySelector(".herobox"); if (h) { h.outerHTML = heroHTML(); heroRestore(); } } }, 30e3);
// remember which top card is showing (and move the dots) while swiping. A looping track holds five copies of the card list; the middle copy is the one at rest.

document.addEventListener("scroll", e => {
  const tr = e.target; if (!tr.classList || !tr.classList.contains("herotrack")) return;
  clearTimeout(tr._settle); tr._settle = setTimeout(() => heroSettle(tr), 140);
  const loop = !!tr.dataset.loop, n = loop ? tr.children.length / 5 : tr.children.length, i = ((heroPage(tr) % n) + n) % n; if (i === S.heroIdx) return;
  S.heroIdx = i; markHeroDash(tr.closest(".herobox"), i);   // 换了张：进度短划线从头走（js/herocycle.js）
}, true);
// a finger or mouse button held on the track blocks the jump until it is let go
document.addEventListener("pointerdown", e => { const tr = e.target.closest && e.target.closest(".herotrack"); if (tr) { tr._down = true; tr.closest(".herobox").classList.add("is-hold"); } }, true);
const heroRelease = () => document.querySelectorAll(".herotrack").forEach(tr => { if (tr._down) { tr._down = false; const box = tr.closest(".herobox"); box.classList.remove("is-hold"); markHeroDash(box, S.heroIdx || 0); if (box.contains(document.activeElement)) document.activeElement.blur(); clearTimeout(tr._settle); tr._settle = setTimeout(() => heroSettle(tr), 140); } });
initHeroCycle({ next: tr => { heroSettle(tr); tr.scrollTo({ left: (heroPage(tr) + 1) * (tr.clientWidth + 10), behavior: "smooth" }); } });   // 进度条走满：下一张
document.addEventListener("pointerup", heroRelease, true); document.addEventListener("pointercancel", heroRelease, true);
if (!initSupabase()) initCloud();
setTimeout(() => { if (S.mode === "local") runScheduled(); }, 5000);   // 本机模式：打开 5 秒后检查定时备份（家庭模式在 enterFamily 里）
setInterval(() => syncNow(), 60e3);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });
window.addEventListener("online", () => syncNow());
