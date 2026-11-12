/* ============ boot ============
   Entry module. Module order: i18n → util → units → state → types → derived → store/sync → views/meal/trend → sheet → events.
   Cross-module calls happen only inside functions, so the import cycles (store ↔ sync ↔ views) are safe. */
import { initHeroCycle, markHeroDash } from "./herocycle.js";
import "./events.js"; // registers the global click / change / input handlers
import "./attach.js";   // AI 附件区 + 会自己长高的文字框（姊妹应用同一份）
import "./intake.js"; // AI 一次录入体检 / 就诊（自己的 data-ix 点击处理）
import { applyLang, lang } from "./i18n.js";
import { APP_VERSION, S, loadLocal } from "./state.js";
import { initReleases } from "./releases-ui.js";
import { RELEASES } from "./releases-data.js";
import { initCloud } from "./store.js";
import { initProviders, runScheduled } from "./backup.js";
import { initSupabase, syncNow } from "./sync.js";
import { $ } from "./util.js";
import { heroHTML, heroPage, heroRestore, heroSettle, render } from "./views.js";

applyLang(); loadLocal();
// 发布日志（js/releases-ui.js，四个姊妹应用同一份）：记新版本提示出现了几次；在首屏 render 之前，今天页才能带上提示
initReleases({ version: APP_VERSION, releases: RELEASES, lang, accent: "var(--slate)", appId: "baby-log", open: 'data-tab="releases"' });
render();
initProviders();   // 从 Dropbox 授权页跳回来时把 ?code= 换成令牌（js/backup.js）
// 每 30 秒刷新顶部计时卡（只换 .herobox）；正在用音乐卡的下拉框 / 滑块，或 ⚙ 菜单开着时这一轮先不换
setInterval(() => { if (S.tab === "today" && !$("#sheet").open) { const h = document.querySelector(".herobox"); const a = document.activeElement; if (h && !(h.contains(a) && a.matches("select, input")) && !h.querySelector(".herogear[open]")) { h.outerHTML = heroHTML(); heroRestore(); } } }, 30e3);
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
