/* 导航小卡片组（照爱家小助手 js/core/hub.js 的 tabCards / .pnav-card）：一排带图标的卡片，当前页深色高亮；
   用于页内切换（记录页的三个视图、体检的「提醒 / 历史记录」、成长各页互相跳转）。
   items = [{ icon, label, attrs }]；attrs 是写在按钮上的属性字符串（如 'data-logview="list"'、'data-tab="grow-sleep"'）；active = 当前项的下标。
   卡片 ≤ 4 张：手机 2 × 2（2 张时并排）；5 张以上：每行 3 张。 */
import { esc } from "./util.js";
import { t } from "./i18n.js";
import { viewToggleHTML } from "./shared/ui-reclist.js";
import { watchViewSwitch } from "./shared/ui-viewsw.js"; watchViewSwitch();   // 视图切换下拉：点外面 / Esc / 点了一项收起

export const pnavHTML = (items, active, label) => `<nav class="pnav" data-n="${items.length}" aria-label="${esc(label)}">${items.map((x, i) =>
  `<button type="button" class="pnav-card" ${x.attrs}${i === active ? ' aria-current="page"' : ""}><span class="pnav-ico" aria-hidden="true">${x.icon}</span><span class="pnav-lbl">${esc(x.label)}</span></button>`).join("")}</nav>`;

/** 成长各子页顶上的导航卡片：六个主题互相跳转（和成长首页的入口同一份清单） */
export const GROW_PAGES = [["grow-milestones", "⭐", "发育里程碑"], ["grow-foods", "🥣", "新食物与反应"], ["grow-sleep", "🌙", "睡眠"], ["grow-body", "📏", "基本体征"], ["grow-checkups", "🩺", "儿科体检与就诊"], ["grow-vax", "💉", "疫苗接种记录"]];
/** 视图切换条（统一控件）：靠右的一个按钮，只有两个视图 = 小药丸，两个以上 = 下拉；点一项就是点一个带 data-{attr} 的按钮 */
export const viewBarHTML = (options, current, attr, label) => `<div class="ui-vsw-bar">${viewToggleHTML(options, current, { attr, label, t })}</div>`;
/** 成长子页顶上：在六个主题之间切换（下拉）；成长首页（cur = null）仍用入口卡片 */
export const growNav = cur => cur
  ? viewBarHTML(GROW_PAGES.map(([k, , l]) => [k, t(l)]), cur, "tab", t("成长主题"))
  : pnavHTML(GROW_PAGES.map(([k, icon, l]) => ({ icon, label: t(l), attrs: `data-tab="${k}"` })), -1, t("成长主题"));
