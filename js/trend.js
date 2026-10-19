import { sleepMsIn } from "./derived.js";
import { t } from "./i18n.js";
import { stageMetrics } from "./stages.js";
import { S, vis } from "./state.js";
import { isUS, toDisp, unitOf } from "./units.js";
import { $, D, H, dayKey, num, startOfDay } from "./util.js";

/* ---------- 趋势对比：日 / 周 ---------- */
const METRICS = {
  sleep:   { label: "睡眠时长", unit: "小时", dec: 1, color: "var(--slate)", day: (a, b) => sleepMsIn(a, b) / H },
  longest: { label: "最长一觉", unit: "小时", dec: 1, color: "var(--slate)", max: true,
             day: (a, b) => Math.max(0, ...inRange(a, b, "sleep").filter(e => e.end).map(e => (e.end - e.ts) / H)) },
  ml:      { label: "瓶喂奶量", get unit(){ return unitOf("vol"); }, get dec(){ return isUS() ? 1 : 0; }, color: "var(--honey)", day: (a, b) => toDisp("vol", inRange(a, b, "feed").reduce((s, e) => s + (+e.ml || 0), 0)) },
  nurse:   { label: "亲喂时长", unit: "分钟", dec: 0, color: "var(--honey)", day: (a, b) => inRange(a, b, "feed").reduce((s, e) => s + (+e.left || 0) + (+e.right || 0), 0) },
  feeds:   { label: "喂奶次数", unit: "次", dec: 1, color: "var(--honey)", day: (a, b) => inRange(a, b, "feed").filter(e => e.method !== "吸奶").length },
  wet:     { label: "湿尿布", unit: "次", dec: 1, color: "var(--sky)", day: (a, b) => inRange(a, b, "diaper").filter(e => e.pee).length },
  poop:    { label: "大便", unit: "次", dec: 1, color: "var(--sky)", day: (a, b) => inRange(a, b, "diaper").filter(e => e.poop).length },
  pump:    { label: "吸奶量", get unit(){ return unitOf("vol"); }, get dec(){ return isUS() ? 1 : 0; }, color: "#9B7BB8", day: (a, b) => toDisp("vol", inRange(a, b, "feed").filter(e => e.method === "吸奶").reduce((s, e) => s + (+e.ml || 0), 0)) },
  /* 婴儿期起 */
  food:    { label: "吃饭 / 辅食", unit: "次", dec: 1, color: "#C8743A", day: (a, b) => inRange(a, b, "food").filter(e => e.meal !== "奶").length },
  potty:   { label: "如厕成功", unit: "次", dec: 1, color: "var(--sky)", day: (a, b) => inRange(a, b, "potty").filter(e => ["小马桶", "马桶"].includes(e.where) && e.what !== "坐了没出").length },
  read:    { label: "阅读", unit: "分钟", dec: 0, color: "#7A6FB5", day: (a, b) => actMinutes(a, b, "阅读") },
  outdoor: { label: "户外", unit: "分钟", dec: 0, color: "var(--sage)", day: (a, b) => actMinutes(a, b, "户外") },
  screen:  { label: "屏幕时间", unit: "分钟", dec: 0, color: "var(--muted)", day: (a, b) => actMinutes(a, b, "屏幕") },
  words:   { label: "语言记录", unit: "条", dec: 1, color: "#5B8E5A", day: (a, b) => inRange(a, b, "speech").length },
  tantrum: { label: "发脾气 / 哭闹", unit: "次", dec: 1, color: "var(--rose)", day: (a, b) => inRange(a, b, "behavior").filter(e => ["发脾气", "哭闹"].includes(e.kind)).length },
  /* 学龄期起 */
  companion: { label: "陪伴", unit: "分钟", dec: 0, color: "#C2677B", day: (a, b) => inRange(a, b, "companion").reduce((s, e) => s + (+e.minutes || 0), 0) },
  mood:    { label: "心情", unit: "分（1–5）", dec: 1, color: "#4F8FA8", day: (a, b) => { const lv = inRange(a, b, "mood").map(e => e.level).filter(v => v != null); return lv.length ? lv.reduce((s, v) => s + v, 0) / lv.length : null; } },
  habit:   { label: "自律：自己做到", unit: "次", dec: 1, color: "#5F7F9B", day: (a, b) => inRange(a, b, "habit").filter(e => e.self).length },
  social:  { label: "社交", unit: "次", dec: 1, color: "#5B8E5A", day: (a, b) => inRange(a, b, "social").length }
};
const mLabel = k => t(METRICS[k].label), mUnit = k => t(METRICS[k].unit);
function actMinutes(a, b, kind){ return inRange(a, b, "activity").filter(e => e.kind === kind).reduce((s, e) => s + (+e.minutes || 0), 0); }
function inRange(a, b, type){ return vis().filter(e => e.type === type && e.ts >= a && e.ts < b); }
function hasData(a, b){ return vis().some(e => e.ts >= a && e.ts < b); }
function weekStart(ts){ const d0 = startOfDay(ts); const wd = (new Date(d0).getDay() + 6) % 7; return d0 - wd * D; }
// one bucket = a day, or a week reported as average per recorded day
function buckets(gran, n){
  const out = [], now = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    if (gran === "day") { const a = startOfDay(now) - i * D; out.push({ a, b: a + D, label: dayKey(a).slice(5).replace("-", "/"), partial: i === 0 }); }
    else { const a = weekStart(now) - i * 7 * D; out.push({ a, b: a + 7 * D, label: dayKey(a).slice(5).replace("-", "/"), partial: i === 0 }); }
  }
  return out;
}
function metricValue(m, bk){
  const M = METRICS[m];
  if (bk.b - bk.a === D) return hasData(bk.a, bk.b) ? M.day(bk.a, bk.b) : null;
  const vals = [];
  for (let t = bk.a; t < bk.b && t <= Date.now(); t += D) if (hasData(t, t + D)) { const v = M.day(t, t + D); if (v != null) vals.push(v); } // a day without that kind of record has no value (e.g. mood)
  if (!vals.length) return null;
  return M.max ? Math.max(...vals) : vals.reduce((x, y) => x + y, 0) / vals.length;
}
function fmtV(m, v){ return v == null ? "–" : (Math.round(v * 10 ** METRICS[m].dec) / 10 ** METRICS[m].dec).toString(); }
function barChart(m, bks, vals){
  const W = 360, Hh = 170, P = { l: 8, r: 8, t: 18, b: 22 }, M = METRICS[m];
  const max = Math.max(1, ...vals.filter(v => v != null));
  const bw = (W - P.l - P.r) / bks.length;
  const done = vals.filter((v, i) => v != null && !bks[i].partial);
  const avg = done.length ? done.reduce((a, b) => a + b, 0) / done.length : null;
  const Y = v => Hh - P.b - v / max * (Hh - P.t - P.b);
  let g = "";
  bks.forEach((bk, i) => {
    const v = vals[i], x = P.l + i * bw + bw * .15, w = bw * .7;
    if (v != null) {
      g += `<rect x="${x.toFixed(1)}" y="${Y(v).toFixed(1)}" width="${w.toFixed(1)}" height="${(Hh - P.b - Y(v)).toFixed(1)}" rx="3" fill="${M.color}" ${bk.partial ? 'fill-opacity=".45"' : ""}/>`;
      if (bks.length <= 14) g += `<text x="${(x + w / 2).toFixed(1)}" y="${(Y(v) - 4).toFixed(1)}" text-anchor="middle">${fmtV(m, v)}</text>`;
    }
    if (bks.length <= 8 || i % 2 === (bks.length - 1) % 2) g += `<text x="${(x + w / 2).toFixed(1)}" y="${Hh - 6}" text-anchor="middle">${bk.label}</text>`;
  });
  if (avg != null) g += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(avg).toFixed(1)}" y2="${Y(avg).toFixed(1)}" stroke="var(--ink)" stroke-dasharray="4 4" stroke-opacity=".5"/>`;
  const per = S.gran === "day" ? t("每天") : t("每周日均");
  return `<div class="scroll-x"><svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="${t("{metric}{per}柱状图，虚线为平均值 {avg}{unit}", { metric: mLabel(m), per, avg: avg == null ? t("无") : fmtV(m, avg), unit: mUnit(m) })}">${g}</svg></div>
  <div class="legend"><span style="--c:${M.color}">${S.gran === "day" ? t("每天") : t("每周日均（日期为周一）")}</span><span style="--c:${M.color};opacity:.5">${t("进行中")}</span><span style="--c:transparent">${t("┅ 虚线为平均")}</span></div>`;
}
function viewTrend(){
  const n = S.gran === "day" ? 14 : 8;
  const keys = stageMetrics();
  if (!keys.includes(S.metric)) S.metric = keys[0]; // the stage (or the child) changed since the metric was picked
  const bks = buckets(S.gran, n);
  const vals = bks.map(bk => metricValue(S.metric, bk));
  const M = METRICS[S.metric];
  const cur = vals[vals.length - 1], prev = vals[vals.length - 2];
  const delta = (c, p) => (c == null || p == null) ? "" : c - p;
  const pct = (c, p) => (c == null || p == null || p === 0) ? "" : ` (${c >= p ? "+" : ""}${Math.round((c - p) / p * 100)}%)`;
  const per = S.gran === "day" ? [t("今天"), t("昨天")] : [t("本周"), t("上周")];
  const dv = delta(cur, prev);
  const daily = S.gran === "week" ? t("日均") : "";
  // comparison table across all metrics
  const cmpRows = Object.keys(METRICS).map(k => {
    const c = metricValue(k, bks[bks.length - 1]), p = metricValue(k, bks[bks.length - 2]);
    if (!c && !p) return ""; // hide metrics with no data in either period
    const d = delta(c, p);
    return `<div><button data-metric="${k}">${mLabel(k)}</button> <span class="small muted">${mUnit(k)}</span></div>
      <div class="num">${fmtV(k, c)}</div><div class="num">${fmtV(k, p)}</div>
      <div class="num ${d === "" || Math.abs(d) < 1e-9 ? "" : d > 0 ? "up" : "down"}">${d === "" ? "–" : (d > 0 ? "↑" : d < 0 ? "↓" : "") + fmtV(k, Math.abs(d))}</div>`;
  }).join("");
  if (!vis().length) return `<div class="empty">${t("还没有记录。记录几天后这里会显示趋势。")}</div>`;
  return `
  <div class="chips" role="group" aria-label="${t("时间粒度")}" style="margin-top:12px">
    <button class="chip" data-gran="day" aria-pressed="${S.gran === "day"}">${t("按天（14 天）")}</button>
    <button class="chip" data-gran="week" aria-pressed="${S.gran === "week"}">${t("按周（8 周）")}</button>
  </div>
  <div class="chips" role="group" aria-label="${t("指标")}">${keys.map(k => `<button class="chip" data-metric="${k}" aria-pressed="${S.metric === k}">${mLabel(k)}</button>`).join("")}</div>
  <div class="panel">
    <div class="small muted">${mLabel(S.metric)} · ${per[0]}${S.gran === "week" ? (M.max ? t("最长") : t("日均")) : ""}${bks[bks.length - 1].partial ? t("（进行中）") : ""}</div>
    <div class="kpi"><span class="v">${fmtV(S.metric, cur)}</span><span class="muted">${mUnit(S.metric)}</span>
      ${dv !== "" ? `<span class="d ${dv > 0 ? "up" : dv < 0 ? "down" : ""}" style="color:var(--muted)">${t("比{per} {delta}{pct}", { per: per[1], delta: (dv > 0 ? "+" : dv < 0 ? "−" : "±") + fmtV(S.metric, Math.abs(dv)), pct: pct(cur, prev) })}</span>` : ""}</div>
    ${barChart(S.metric, bks, vals)}
  </div>
  <h2>${per[0]} vs ${per[1]}</h2>
  <div class="panel"><div class="cmp">
    <div class="h">${t("指标")}</div><div class="h">${per[0]}${daily}</div><div class="h">${per[1]}${daily}</div><div class="h">${t("变化")}</div>
    ${cmpRows}
  </div>
  <p class="small muted" style="margin-top:8px">${S.gran === "week" ? t("周数据按“有记录的天数”求日均（最长一觉取一周内最长），避免漏记的日子拉低平均。") : t("今天还没过完，和昨天比会偏低，看趋势更准。")}${t("箭头只表示多或少，不代表好坏：例如喂奶次数随月龄减少是正常的。点指标名可切换上方图表。上方只列出当前阶段常用的指标，下表会显示所有有数据的指标。")}</p></div>`;
}

export { METRICS, actMinutes, inRange, hasData, weekStart, buckets, metricValue, fmtV, barChart, viewTrend };
