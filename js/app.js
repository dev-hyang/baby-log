/* ============ boot ============
   Entry module. Module order: util → units → state → types → derived → store/sync → views/meal/trend → sheet → events.
   Cross-module calls happen only inside functions, so the import cycles (store ↔ sync ↔ views) are safe. */
import "./events.js"; // registers the global click / change / input handlers
import { S, loadLocal } from "./state.js";
import { initCloud } from "./store.js";
import { initSupabase, syncNow } from "./sync.js";
import { $ } from "./util.js";
import { heroHTML, render } from "./views.js";

loadLocal(); render();
setInterval(() => { if (S.tab === "today" && !$("#sheet").open) { const h = document.querySelector(".hero"); if (h) h.outerHTML = heroHTML(); } }, 30e3);
if (!initSupabase()) initCloud();
setInterval(() => syncNow(), 60e3);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });
window.addEventListener("online", () => syncNow());
