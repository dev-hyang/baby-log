/* ---- 成长各页的「记录」块（2026-11-12；2026-11-20 起用统一筛选条 js/filterbar.js）----
   和记录页的时间线同一套：搜索 + 时间范围 + 分类（+ 清除筛选）、列表 | 时间轴、按天分组、点一条修改 / 删除、继续加载。
   id：哪一页；all：这一页的全部记录；subs = [[值, 名字, 筛选函数]]（有的页按类别 / 来源再分）；def：默认时间范围；新增按钮在各页自己的右下角「＋」菜单（js/fab-menu.js） */
import { fbarHTML, hit, onFbar } from "./filterbar.js";
import { t } from "./i18n.js";
import { moreHTML, shownOf } from "./pager.js";
import { recAiHTML } from "./rec-ai.js";
import { S, ageAtText } from "./state.js";
import { summary, typeLabel } from "./types.js";
import { D, dayKey, esc, weekday } from "./util.js";
import { axisHTML, entryRow, listStyleSwitch, render } from "./views.js";

const GR_RANGES = [["30", "近 30 天"], ["90", "近 3 个月"], ["365", "近 1 年"], ["all", "全部"]];
const RANGE_DAYS = { "30": 30, "90": 91, "365": 365 };

export function growRecords(id, all, { subs = null, def = "all", empty = "", ai = false } = {}){
  const F = ((S.grf ||= {})[id] ||= { range: def, sub: "all" });
  F.q ??= "";
  const R = RANGE_DAYS[F.range], q = F.q.trim();
  let list = all.filter(e => !R || e.ts >= Date.now() - R * D);
  if (subs && F.sub !== "all") { const sb = subs.find(x => x[0] === F.sub); if (sb) list = list.filter(sb[2]); else F.sub = "all"; }
  if (q) list = list.filter(e => hit(q, typeLabel(e.type), summary(e), e.note, dayKey(e.ts)));
  list = list.slice().sort((a, b) => b.ts - a.ts);
  const key = "gr-" + id, shown = shownOf(key, [S.childId, F.range, F.sub, q].join("|")), style = S.listStyle === "axis" ? "axis" : "rows";
  let left = shown;
  const groups = []; for (const e of list) { const k = dayKey(e.ts), g = groups[groups.length - 1]; if (g && g.k === k) g.es.push(e); else groups.push({ k, es: [e] }); }
  // ai：每条下面一小块 AI 解读（体检与就诊，js/rec-ai.js）
  const show = es => { const k = Math.min(es.length, left); left -= k;
    if (ai) return es.slice(0, k).map(e => `<div class="rec-wrap">${style === "axis" ? axisHTML([e]) : entryRow(e)}${recAiHTML(e)}</div>`).join("");
    return style === "axis" ? axisHTML(es, k) : es.slice(0, k).map(entryRow).join(""); };
  const filtered = F.range !== def || F.sub !== "all" || !!q;
  const body = list.length
    ? groups.map(g => (left ? `<div class="day">${g.k} ${weekday(g.es[0].ts)}<span class="muted"> · ${ageAtText(g.es[0].ts)}</span></div>${show(g.es)}` : "")).join("") + moreHTML(key, list.length, shown)
    : `<div class="empty"><div class="eicon" aria-hidden="true">${q ? "🔍" : "🗓"}</div>${q ? t("没有符合条件的记录，换个关键词试试。") : filtered ? t("这段时间、这一类没有记录。") : empty || t("还没有记录。")}</div>`;
  onFbar(key, {
    set(k, v) { F[k] = v; render(); },
    clear() { F.range = def; F.sub = "all"; F.q = ""; render(); }
  });
  const bar = fbarHTML(key, {
    q: { value: F.q, ph: t("搜索备注、名称、日期") },
    selects: [
      { k: "range", label: t("时间范围"), v: F.range, def, opts: GR_RANGES.map(([k, l]) => [k, t(l)]) },
      subs && { k: "sub", label: t("类型"), v: F.sub, opts: [["all", t("全部")], ...subs.map(([k, l]) => [k, l])] }
    ],
    changed: filtered
  });
  return `<section class="grrec"><div class="listbar"><h2 style="margin:0">${t("记录")} <span class="small muted">${t("{n} 条", { n: list.length })}</span></h2>${listStyleSwitch()}</div>
    ${bar}
    <div class="grlist">${body}</div>
    ${list.length ? `<p class="small muted" style="margin-top:8px">${t("点一条可以修改或删除。")}</p>` : ""}</section>`;
}
