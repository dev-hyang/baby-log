/* 右下角圆形「＋」+ 点开的菜单（做法同爱家小助手 js/core/fab-menu.js，样式见 app.css 的 .fab-menu）。
 * 新增 / 补录都放这里：记录页、成长各页。items = [{ label, icon?, desc?, attrs }]（假值忽略）；
 * attrs 是写在按钮上的属性字符串，如 'data-add="sleep"'、'data-act="addpick"'（点击由 events.js 的全局处理接管）。
 * 只有一项：直接是一个圆形 ＋ 按钮，不弹菜单。 */
import { t } from "./i18n.js";
import { esc } from "./util.js";

const one = x => `<button type="button" role="menuitem" ${x.attrs || ""}>${x.icon ? `<span aria-hidden="true">${x.icon}</span> ` : ""}${esc(x.label)}${x.desc ? `<small>${esc(x.desc)}</small>` : ""}</button>`;

export function fabMenu(items, label = t("添加")){
  const list = (items || []).filter(Boolean);
  if (!list.length) return "";
  if (list.length === 1) return `<button type="button" class="fab-solo" ${list[0].attrs || ""} aria-label="${esc(list[0].label)}" title="${esc(list[0].label)}"><span aria-hidden="true">＋</span></button>`;
  return `<details class="fab-menu"><summary aria-label="${esc(label)}" title="${esc(label)}"><span aria-hidden="true">＋</span></summary>
    <div class="fab-menu-list" role="menu">${list.map(one).join("")}</div></details>`;
}

// 点了菜单里的项或点到菜单外：收起菜单
document.addEventListener("click", e => {
  document.querySelectorAll("details.fab-menu[open]").forEach(d => { if (!d.contains(e.target) || e.target.closest(".fab-menu-list button")) d.open = false; });
});
document.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll("details.fab-menu[open]").forEach(d => { d.open = false; d.querySelector("summary").focus(); }); });
