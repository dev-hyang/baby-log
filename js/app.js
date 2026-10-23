/* ============ boot ============
   Entry module. Module order: i18n → util → units → state → types → derived → store/sync → views/meal/trend → sheet → events.
   Cross-module calls happen only inside functions, so the import cycles (store ↔ sync ↔ views) are safe. */
import "./events.js"; // registers the global click / change / input handlers
import { applyLang } from "./i18n.js";
import { S, loadLocal } from "./state.js";
import { initCloud } from "./store.js";
import { initSupabase, syncNow } from "./sync.js";
import { $ } from "./util.js";
import { heroHTML, heroPage, heroRestore, heroSettle, render } from "./views.js";

applyLang(); loadLocal(); render();
setInterval(() => { if (S.tab === "today" && !$("#sheet").open) { const h = document.querySelector(".herobox"); if (h) { h.outerHTML = heroHTML(); heroRestore(); } } }, 30e3);
// remember which top card is showing (and move the dots) while swiping. A looping track holds five copies of the card list; the middle copy is the one at rest.

document.addEventListener("scroll", e => {
  const tr = e.target; if (!tr.classList || !tr.classList.contains("herotrack")) return;
  clearTimeout(tr._settle); tr._settle = setTimeout(() => heroSettle(tr), 140);
  const loop = !!tr.dataset.loop, n = loop ? tr.children.length / 5 : tr.children.length, i = ((heroPage(tr) % n) + n) % n; if (i === S.heroIdx) return;
  S.heroIdx = i; tr.closest(".herobox").querySelectorAll(".herodots button").forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
}, true);
// a finger or mouse button held on the track blocks the jump until it is let go
document.addEventListener("pointerdown", e => { const tr = e.target.closest && e.target.closest(".herotrack"); if (tr) tr._down = true; }, true);
const heroRelease = () => document.querySelectorAll(".herotrack").forEach(tr => { if (tr._down) { tr._down = false; clearTimeout(tr._settle); tr._settle = setTimeout(() => heroSettle(tr), 140); } });
document.addEventListener("pointerup", heroRelease, true); document.addEventListener("pointercancel", heroRelease, true);
if (!initSupabase()) initCloud();
setInterval(() => syncNow(), 60e3);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });
window.addEventListener("online", () => syncNow());
