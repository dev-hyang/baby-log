import { t } from "./i18n.js";
import { S } from "./state.js";
import { D, dayKey, esc, startOfDay } from "./util.js";
import { entryRow } from "./views.js";

/* ============ 妈妈 → 用药历史与趋势 ============
   近 14 / 30 天妈妈每天吃了几次药（柱状图）、每种药各几次、按天排的每一次（点一条可以改 / 删）、「补记用药」可以选过去的时间。
   数据是 S.entries 里的 mmed 记录（家庭级，不随孩子切换）。 */
const RANGES = [14, 30];

/** 最近 days 天（含今天）每天几次，旧的在前：[{ day, n }] */
function dayCounts(list, days, now = Date.now()){
  const start = startOfDay(now) - (days - 1) * D, out = Array.from({ length: days }, (_, i) => ({ day: dayKey(start + i * D), n: 0 }));
  const at = new Map(out.map(o => [o.day, o]));
  for (const e of list) { const o = at.get(dayKey(e.ts)); if (o) o.n++; }
  return out;
}
const nameOf = e => (e.name || e.cat || "").trim();

function barsHTML(counts){
  const top = Math.max(1, ...counts.map(c => c.n));
  return `<div class="mm-bars" role="img" aria-label="${esc(t("每天用药次数：{v}", { v: counts.map(c => c.n).join("、") }))}">${counts.map((c, i) =>
    `<span class="mm-col"><i style="height:${c.n ? Math.round(6 + c.n / top * 54) : 2}px" class="${c.n ? "" : "zero"}"></i><b>${c.n || ""}</b>${i % (counts.length > 14 ? 5 : 2) === 0 || i === counts.length - 1 ? `<small>${esc(c.day.slice(8))}</small>` : "<small></small>"}</span>`).join("")}</div>`;
}
function momMedsHTML(){
  const days = RANGES.includes(S.momMedDays) ? S.momMedDays : 14, from = startOfDay(Date.now()) - (days - 1) * D;
  const list = S.entries.filter(e => e.type === "mmed" && e.ts >= from).sort((a, b) => b.ts - a.ts);
  const chips = RANGES.map(n => `<button class="chip" data-act="mmdays" data-d="${n}" aria-pressed="${days === n}">${t("近 {n} 天", { n })}</button>`).join("");
  const by = new Map(); for (const e of list) by.set(nameOf(e) || t("未命名"), (by.get(nameOf(e) || t("未命名")) || 0) + 1);
  const names = [...by].sort((a, b) => b[1] - a[1]).map(([n, c]) => `<span class="ui-badge" data-tone="accent">${esc(t(n))} × ${c}</span>`).join(" ");
  const groups = []; for (const e of list) { const k = dayKey(e.ts), g = groups[groups.length - 1]; if (g && g.k === k) g.items.push(e); else groups.push({ k, items: [e] }); }
  return `<div class="btns" style="margin-top:0"><button class="btn primary" data-add="mmed">${t("补记用药")}</button></div>
  <div class="chips mm-range" role="group" aria-label="${esc(t("时间范围"))}" style="margin:10px 0">${chips}</div>
  <div class="panel">${barsHTML(dayCounts(list, days))}
    <p class="small muted" style="margin:8px 0 0">${list.length ? t("共 {n} 次，平均每天 {a} 次", { n: list.length, a: (list.length / days).toFixed(1) }) : t("这段时间没有用药记录。")}</p>
    ${names ? `<div style="margin-top:8px">${names}</div>` : ""}</div>
  ${groups.map(g => `<h3 class="mm-day">${esc(g.k)}</h3>${g.items.map(entryRow).join("")}`).join("")}
  <p class="small muted">${t("点一条可以修改或删除；「补记用药」里的时间可以选过去的。哺乳期用药请先确认医生的意见。")}</p>`;
}
export { momMedsHTML, dayCounts };
