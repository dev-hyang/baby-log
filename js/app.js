/* ============ boot ============
   Entry module. Module order: i18n → util → units → state → types → derived → store/sync → views/meal/trend → sheet → events.
   Cross-module calls happen only inside functions, so the import cycles (store ↔ sync ↔ views) are safe. */
import "./events.js"; // registers the global click / change / input handlers
import { applyLang } from "./i18n.js";
import { S, loadLocal } from "./state.js";
import { initCloud } from "./store.js";
import { initSupabase, syncNow } from "./sync.js";
import { $ } from "./util.js";
import { heroHTML, heroRestore, render } from "./views.js";

applyLang(); loadLocal(); render();
setInterval(() => { if (S.tab === "today" && !$("#sheet").open) { const h = document.querySelector(".herobox"); if (h) { h.outerHTML = heroHTML(); heroRestore(); } } }, 30e3);
// remember which top card is showing (and move the dots) while swiping
document.addEventListener("scroll", e => {
  const tr = e.target; if (!tr.classList || !tr.classList.contains("herotrack")) return;
  const i = Math.round(tr.scrollLeft / (tr.clientWidth + 10)); if (i === S.heroIdx) return;
  S.heroIdx = i; const box = tr.closest(".herobox");
  box.querySelectorAll(".herodots button").forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
  const pv = box.querySelector(".heronav.prev"), nx = box.querySelector(".heronav.next"); if (pv) { pv.disabled = i <= 0; nx.disabled = i >= tr.children.length - 1; }
}, true);
if (!initSupabase()) initCloud();
setInterval(() => syncNow(), 60e3);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });
window.addEventListener("online", () => syncNow());
