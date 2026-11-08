import { t } from "./i18n.js";
import { esc } from "./util.js";

/* ============ 顶部卡片自动换（11-08，和爱家小助手、家庭学堂同一套） ============
   卡片下面一行：‹ 进度短划线 › ⚙。当前那条像进度条走满（默认 10 秒）就到下一张，循环。
   手指按着、鼠标停在卡片上、键盘焦点在里面、⚙ 菜单开着时停住；手动滑 / 点过从头走；系统减少动态效果时不走。
   ⚙ 选 5 / 10 / 15 / 30 秒或关掉，记在这台设备上。 */
const KEY = "baby.cardSecs", SECS = [5, 10, 15, 30];
export const cardSecs = () => { try { const v = localStorage.getItem(KEY); if (v === "0") return 0; return SECS.includes(+v) ? +v : 10; } catch { return 10; } };
const reduced = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** 控制行（n 张卡、当前第 cur 张） */
export function heroCtrlHTML(n, cur){
  const secs = cardSecs();
  const nav = (d, label, ch) => `<button type="button" class="heronav" data-heronav="${d}" aria-label="${esc(label)}">${ch}</button>`;
  const opt = (v) => `<button type="button" class="hg-opt" data-herosecs="${v}" aria-pressed="${secs === v}">${v ? t("{s} 秒", { s: v }) : t("关闭自动切换")}${secs === v ? " ✓" : ""}</button>`;
  return `<div class="heroctrl">${nav(-1, t("上一张"), "‹")}
    <div class="herodashes ${secs ? "" : "is-off"}" title="${esc(secs ? t("每 {s} 秒自动换下一张；手指按着或鼠标停在卡片上时暂停", { s: secs }) : t("自动切换已关闭"))}">${Array.from({ length: n }, (_, i) => `<button type="button" class="herodash ${i === cur ? "is-run" : ""}" data-heropage="${i}" aria-label="${esc(t("第 {i} 张，共 {n} 张", { i: i + 1, n }))}" aria-current="${i === cur}"><i style="animation-duration:${secs || 10}s"></i></button>`).join("")}</div>
    ${nav(1, t("下一张"), "›")}
    <details class="herogear"><summary aria-label="${esc(t("自动切换的时间"))}" title="${esc(t("自动切换的时间"))}">⚙</summary><div class="hg-menu">${[...SECS, 0].map(opt).join("")}</div></details></div>`;
}
/** 当前那条：换成第 i 条，进度条从头走 */
export function markHeroDash(box, i){
  box?.querySelectorAll(".herodash").forEach((b, k) => {
    b.setAttribute("aria-current", String(k === i));
    if (k !== i) { b.classList.remove("is-run"); return; }
    b.classList.remove("is-run"); void b.offsetWidth; b.classList.add("is-run");
  });
}

let goNext = () => {};
/** app.js 接上：怎么换到下一张（要先把循环轨道拉回中间那份） */
export function initHeroCycle({ next }){ goNext = next; }
document.addEventListener("animationend", (e) => {
  if (e.animationName !== "herprog" || !e.target.closest?.(".herodash.is-run") || document.hidden || !cardSecs() || reduced()) return;
  const tr = e.target.closest(".herobox")?.querySelector(".herotrack"); if (!tr || tr._down) return;
  goNext(tr);
}, true);
document.addEventListener("click", (e) => {
  const o = e.target.closest?.("[data-herosecs]");
  if (o) {   // ⚙ 选了秒数
    try { localStorage.setItem(KEY, o.dataset.herosecs); } catch { /* 忽略 */ }
    const box = o.closest(".herobox"), v = cardSecs();
    box?.querySelectorAll(".herodash i").forEach((i) => { i.style.animationDuration = `${v || 10}s`; });
    box?.querySelector(".herodashes")?.classList.toggle("is-off", !v);
    box?.querySelectorAll("[data-herosecs]").forEach((x) => { const on = +x.dataset.herosecs === v; x.setAttribute("aria-pressed", String(on)); x.textContent = (+x.dataset.herosecs ? t("{s} 秒", { s: +x.dataset.herosecs }) : t("关闭自动切换")) + (on ? " ✓" : ""); });
    o.closest("details")?.removeAttribute("open");
    const cur = [...(box?.querySelectorAll(".herodash") || [])].findIndex((b) => b.getAttribute("aria-current") === "true");
    markHeroDash(box, Math.max(0, cur)); return;
  }
  document.querySelectorAll(".herogear[open]").forEach((d) => { if (!d.contains(e.target)) d.removeAttribute("open"); });
  const b = e.target.closest?.("[data-heronav], [data-heropage]"); if (b && e.detail) setTimeout(() => b.blur(), 0);   // 鼠标 / 手指点的：不把焦点留在按钮上（焦点在里面进度条会停）
});
