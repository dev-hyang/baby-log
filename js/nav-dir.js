import { t } from "./i18n.js";
import { esc } from "./util.js";
import { treeHTML, watchTree } from "./shared/ui-tree.js";

/* ============ 路径栏的「目录」按钮（和爱家小助手 / 牧羊人同一套）============
   点开列出整棵页面树：底部页签 → 它下面的子页面；当前页打勾，所在的大类默认展开。点一项 = 去那一页（data-tab，events.js 处理）。
   树从 views.js 的 SUB（子页面 → [上一层, 画法]）推出来，不另存一份清单，新增子页面自动出现。 */
const TOP = ["today", "log", "mom", "grow", "me"];
const SKIP = new Set(["settings"]);   // 旧链接，和 family 是同一页
const ICON = `<svg class="crumb-ico" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M3 5h14M3 10h14M3 15h14"/></svg>`;

/** 页面树结点（给 shared/ui-tree.js）；妈妈页签没显示时（不在产后阶段）不列 */
export function dirNodes(SUB, TAB_LABEL, PAGE_LABEL, cur){
  const kids = p => Object.keys(SUB).filter(k => SUB[k][0] === p && !SKIP.has(k));
  const mk = k => { const ch = kids(k).map(mk); return { label: t(TAB_LABEL[k] || PAGE_LABEL[k] || k), attrs: `data-tab="${k}"`, on: k === cur, children: ch.length ? ch : null }; };
  const momOff = document.querySelector('nav.tabs [data-tab="mom"]')?.hidden;
  return TOP.filter(k => !(k === "mom" && momOff)).map(mk);
}
export function dirHTML(nodes){
  return `<details class="crumb-dir"><summary class="crumb-menu" aria-label="${esc(t("目录"))}">${ICON}<span>${t("目录")}</span></summary>
    <div class="dirmenu" role="menu" aria-label="${esc(t("目录"))}">${treeHTML(nodes, { label: "目录", t })}</div></details>`;
}

let watching = false;
/** 入口调一次：› 展开 / 收起；点外面、Esc 把目录收起 */
export function watchDir(){
  if (watching) return; watching = true; watchTree();
  document.addEventListener("click", e => document.querySelectorAll("details.crumb-dir[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; }));
  document.addEventListener("keydown", e => { if (e.key !== "Escape") return; const d = document.querySelector("details.crumb-dir[open]"); if (d) { d.open = false; d.querySelector("summary")?.focus(); } });
}
