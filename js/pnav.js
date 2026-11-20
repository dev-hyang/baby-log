/* 导航小卡片组（照爱家小助手 js/core/hub.js 的 tabCards / .pnav-card）：一排带图标的卡片，当前页深色高亮；
   用于页内切换（记录页的三个视图、体检的「提醒 / 历史记录」、成长各页互相跳转）。
   items = [{ icon, label, attrs }]；attrs 是写在按钮上的属性字符串（如 'data-logview="list"'、'data-tab="grow-sleep"'）；active = 当前项的下标。
   卡片 ≤ 4 张：手机 2 × 2（2 张时并排）；5 张以上：每行 3 张。 */
import { esc } from "./util.js";
import { t } from "./i18n.js";

export const pnavHTML = (items, active, label) => `<nav class="pnav" data-n="${items.length}" aria-label="${esc(label)}">${items.map((x, i) =>
  `<button type="button" class="pnav-card" ${x.attrs}${i === active ? ' aria-current="page"' : ""}><span class="pnav-ico" aria-hidden="true">${x.icon}</span><span class="pnav-lbl">${esc(x.label)}</span></button>`).join("")}</nav>`;

/** 成长各子页顶上的导航卡片：六个主题互相跳转（和成长首页的入口同一份清单） */
export const GROW_PAGES = [["grow-milestones", "⭐", "发育里程碑"], ["grow-foods", "🥣", "新食物与反应"], ["grow-sleep", "🌙", "睡眠"], ["grow-body", "📏", "基本体征"], ["grow-checkups", "🩺", "儿科体检与就诊"], ["grow-vax", "💉", "疫苗接种记录"]];
export const growNav = cur => pnavHTML(GROW_PAGES.map(([k, icon, l]) => ({ icon, label: t(l), attrs: `data-tab="${k}"` })), GROW_PAGES.findIndex(p => p[0] === cur), t("成长主题"));
