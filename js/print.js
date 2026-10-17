import { byTime } from "./derived.js";
import { t } from "./i18n.js";
import { mealRows } from "./meal.js";
import { stageTypes } from "./stages.js";
import { CHECKUPS, S, ageAtText, ageText, birthTs, checkupDate, checkupsDone, child, childName, childOf, matchCheckup, stageOf, vis } from "./state.js";
import { METRICS, buckets, fmtV, metricValue } from "./trend.js";
import { TYPES, flags, isVisit, summary, typeLabel } from "./types.js";
import { fmtU, isUS, toDisp, trim, unitOf } from "./units.js";
import { $, D, H, dayKey, esc, hm, startOfDay, weekday } from "./util.js";

/* ============ print: meal table / trend / timeline / medical history ============
   A page's HTML goes into #print, body gets .printing and window.print() runs; the print stylesheet shows
   only #print (black text, bordered tables, no theme colours). Same mechanism as homeschool. */
function header(title, sub){
  return `<div class="phead"><div><div class="ptitle">${title}</div><div class="psub">${sub}</div></div>
    <div class="pright">${t("小月亮 · 母婴记录")}<br>${t("打印于 {date}", { date: dayKey(Date.now()) + " " + hm(Date.now()) })}</div></div>`;
}
const who = () => `${esc(childName())} · ${esc(ageText())}${child().birth ? ` · ${t("生日 {date}", { date: child().birth })}` : ""}`;
const vol = ml => ml ? trim(toDisp("vol", ml), isUS() ? 1 : 0) : "";
const nbsp = s => s || "";

/* ---- one feed per row for the day shown in the log ---- */
function mealPage(){
  const d0 = S.mealDay ?? startOfDay(Date.now());
  const rows = mealRows().filter(r => r.f.ts >= d0 && r.f.ts < d0 + D);
  const sum = k => rows.reduce((a, r) => a + (+r.f[k] || 0), 0);
  const peeN = rows.reduce((a, r) => a + r.pee.length, 0), poopN = rows.reduce((a, r) => a + r.poop.length, 0), sleepT = rows.reduce((a, r) => a + r.sleepMs, 0);
  const body = rows.map(r => { const f = r.f, colors = r.poop.map(p => p.color).filter(Boolean).map(c => t(c)).join("、");
    return `<tr><td class="n">${hm(f.ts)}</td><td class="n">${r.gap ? (r.gap / H).toFixed(1) + "h" : "–"}</td><td>${esc(f.method ? t(f.method) : "")}</td><td class="n">${nbsp(f.left)}</td><td class="n">${nbsp(f.right)}</td><td class="n">${vol(f.ml)}</td>
      <td class="c">${r.pee.length ? "✓" + (r.pee.length > 1 ? r.pee.length : "") : ""}</td><td class="c">${r.poop.length ? "✓" + (r.poop.length > 1 ? r.poop.length : "") : ""}</td><td class="n">${r.sleepMs ? (r.sleepMs / H).toFixed(1) + "h" : ""}</td>
      <td>${esc([colors && t("便") + colors, ...r.meds, f.note].filter(Boolean).join(" · "))}</td></tr>`; }).join("");
  return `<section class="ppage pwide">${header(`${t("按餐表格")} · ${dayKey(d0)} ${weekday(d0)}`, who())}
  ${rows.length ? `<table><thead><tr><th>${t("时间")}</th><th>${t("距上餐")}</th><th>${t("方式")}</th><th class="n">${t("左<br>分钟").replace("<br>", " ")}</th><th class="n">${t("右<br>分钟").replace("<br>", " ")}</th><th class="n">${t("奶量")} ${unitOf("vol")}</th><th class="c">${t("尿")}</th><th class="c">${t("便")}</th><th class="n">${t("之后<br>睡眠").replace("<br>", " ")}</th><th>${t("备注 / 用药")}</th></tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td>${t("{n} 餐", { n: rows.length })}</td><td></td><td></td><td class="n">${sum("left") || ""}</td><td class="n">${sum("right") || ""}</td><td class="n">${vol(sum("ml"))}</td><td class="c">${peeN}</td><td class="c">${poopN}</td><td class="n">${sleepT ? (sleepT / H).toFixed(1) + "h" : ""}</td><td></td></tr></tfoot></table>`
    : `<p class="pmuted">${t("这一天没有喂奶记录。")}</p>`}
  <p class="pfoot">${t("每行是一餐：尿布、睡眠、用药归到这一餐到下一餐之间。")}</p></section>`;
}

/* ---- metrics × days (or weeks): every metric that has data in the window ---- */
function trendPage(){
  const gran = S.gran === "week" ? "week" : "day", bks = buckets(gran, gran === "day" ? 7 : 8);
  const rows = Object.keys(METRICS).map(k => ({ k, vals: bks.map(bk => metricValue(k, bk)) })).filter(r => r.vals.some(v => v != null && v !== 0));
  const title = gran === "day" ? t("趋势对比 · 最近 7 天") : t("趋势对比 · 最近 8 周（日均）");
  return `<section class="ppage pwide">${header(title, who())}
  ${rows.length ? `<table><thead><tr><th>${t("指标")}</th>${bks.map(bk => `<th class="n">${bk.label}${bk.partial ? "*" : ""}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr><td>${t(METRICS[r.k].label)} <span class="pmuted">${t(METRICS[r.k].unit)}</span></td>${r.vals.map(v => `<td class="n">${fmtV(r.k, v)}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <p class="pfoot">${gran === "week" ? t("周数据按“有记录的天数”求日均（最长一觉取一周内最长），避免漏记的日子拉低平均。") : ""}${t("* 进行中的一天 / 一周还没过完。")}</p>`
    : `<p class="pmuted">${t("还没有记录。记录几天后这里会显示趋势。")}</p>`}</section>`;
}

/* ---- the timeline as shown (current type filter and search), last 30 days ---- */
function timelinePage(){
  const q = S.q.trim().toLowerCase(), from = Date.now() - 30 * D;
  let list = vis().filter(e => e.ts >= from).sort(byTime);
  if (S.filter !== "all") list = list.filter(e => S.filter === "momall" ? ["mmed", "mbody"].includes(e.type) : e.type === S.filter);
  if (q) list = list.filter(e => (typeLabel(e.type) + " " + summary(e) + " " + (e.note || "") + " " + dayKey(e.ts)).toLowerCase().includes(q));
  const groups = {}; for (const e of list) (groups[dayKey(e.ts)] ||= []).push(e);
  const scope = S.filter === "all" ? t("全部") : S.filter === "momall" ? t("妈妈") : typeLabel(S.filter);
  return `<section class="ppage">${header(`${t("时间线")} · ${t("最近 30 天")} · ${esc(scope)}${q ? ` · “${esc(S.q.trim())}”` : ""}`, who())}
  ${list.length ? Object.entries(groups).map(([d, es]) => `<div class="pday">${d} ${weekday(es[0].ts)} · ${t("{n} 条", { n: es.length })}</div>
    <table><tbody>${es.map(e => { const fl = flags(e); return `<tr><td class="n" style="width:12%">${hm(e.ts)}</td><td style="width:18%">${esc(typeLabel(e.type))}</td><td>${esc(summary(e))}${e.note ? `<br><span class="pmuted">${esc(e.note)}</span>` : ""}${fl.map(f => `<br><span class="pwarn">${esc(f)}</span>`).join("")}</td></tr>`; }).join("")}</tbody></table>`).join("")
    : `<p class="pmuted">${t("没有符合条件的记录，换个关键词试试。")}</p>`}
  <p class="pfoot">${t("共 {n} 条。", { n: list.length })}</p></section>`;
}

/* ---- what a pediatrician asks for: visits, schedule, vaccines, growth, recent meds ---- */
function medicalPage(){
  const all = vis(), done = checkupsDone();
  const visits = all.filter(isVisit).sort((a, b) => b.ts - a.ts);
  const vax = all.filter(e => e.type === "vax" || (e.type === "bmed" && e.cat === "疫苗")).sort((a, b) => a.ts - b.ts);
  const growth = all.filter(e => e.type === "baby" && (e.weight || e.length || e.head)).sort((a, b) => a.ts - b.ts);
  const meds = all.filter(e => e.type === "bmed" && e.ts > Date.now() - 90 * D).sort(byTime);
  const meas = e => [e.temp && `${t("体温")} ${fmtU("temp", e.temp)}`, e.weight && `${t("体重")} ${fmtU("wbaby", e.weight)}`, e.length && `${t("身长")} ${fmtU("len", e.length)}`, e.head && `${t("头围")} ${fmtU("len", e.head)}`].filter(Boolean).join(" · ");
  const none = `<p class="pmuted">${t("暂无记录")}</p>`;
  return `<section class="ppage">${header(t("就医记录"), who())}
  <table class="pkv"><tr><th>${t("孩子")}</th><td>${esc(childName())}</td></tr><tr><th>${t("出生日期")}</th><td>${esc(child().birth || "")}</td></tr><tr><th>${t("年龄")}</th><td>${esc(ageText())}</td></tr></table>
  <h3>${t("体检与就诊")}</h3>
  ${visits.length ? `<table><thead><tr><th>${t("日期")}</th><th>${t("月龄")}</th><th>${t("类型")}</th><th>${t("医院 / 医生")}</th><th>${t("测量")}</th><th>${t("备注")}</th></tr></thead><tbody>
    ${visits.map(e => { const m = e.src === "儿科体检" ? matchCheckup(e.ts, childOf(e)) : null; return `<tr><td class="n">${dayKey(e.ts)}</td><td>${ageAtText(e.ts)}</td><td>${esc(t(e.src))}${m ? `<br><span class="pmuted">${t(m.label)}</span>` : ""}</td><td>${esc(e.clinic || "")}</td><td>${esc(meas(e))}</td><td>${esc(e.note || "")}</td></tr>`; }).join("")}</tbody></table>` : none}
  ${birthTs() ? `<h3>${t("体检时间表")}</h3><table><thead><tr><th>${t("时间点")}</th><th>${t("约在")}</th><th class="c">${t("完成")}</th></tr></thead><tbody>
    ${CHECKUPS.map(c => `<tr><td>${t(c.label)}</td><td class="n">${dayKey(checkupDate(c))}</td><td class="c">${done[c.k] ? "✓" : ""}</td></tr>`).join("")}</tbody></table>` : ""}
  <h3>${t("疫苗接种记录")}</h3>
  ${vax.length ? `<table><thead><tr><th>${t("日期")}</th><th>${t("月龄")}</th><th>${t("疫苗")}</th><th>${t("剂次")}</th><th>${t("部位")}</th><th>${t("接种机构 / 医生")}</th><th>${t("批号（选填）")}</th><th>${t("反应")}</th></tr></thead><tbody>
    ${vax.map(e => `<tr><td class="n">${dayKey(e.ts)}</td><td>${ageAtText(e.ts)}</td><td>${esc(e.name || (e.cat ? t(e.cat) : ""))}</td><td>${esc(e.dose ? t(e.dose) : "")}</td><td>${esc(e.site ? t(e.site) : "")}</td><td>${esc(e.clinic || "")}</td><td>${esc(e.lot || "")}</td><td>${esc(e.reaction ? t(e.reaction) : "")}</td></tr>`).join("")}</tbody></table>` : none}
  <h3>${t("生长测量")}</h3>
  ${growth.length ? `<table><thead><tr><th>${t("日期")}</th><th>${t("月龄")}</th><th class="n">${t("体重")} (${unitOf("wbaby")})</th><th class="n">${t("身长")} (${unitOf("len")})</th><th class="n">${t("头围")} (${unitOf("len")})</th><th>${t("记录来源")}</th></tr></thead><tbody>
    ${growth.map(e => `<tr><td class="n">${dayKey(e.ts)}</td><td>${ageAtText(e.ts)}</td><td class="n">${e.weight ? fmtU("wbaby", e.weight) : ""}</td><td class="n">${e.length ? fmtU("len", e.length) : ""}</td><td class="n">${e.head ? fmtU("len", e.head) : ""}</td><td>${esc(t(e.src || "自己记录"))}</td></tr>`).join("")}</tbody></table>` : none}
  <h3>${t("宝宝用药（最近 90 天）")}</h3>
  ${meds.length ? `<table><thead><tr><th>${t("日期")}</th><th>${t("时间")}</th><th>${t("类别")}</th><th>${t("名称")}</th><th>${t("剂量（按医嘱/说明书）")}</th><th>${t("备注")}</th></tr></thead><tbody>
    ${meds.map(e => `<tr><td class="n">${dayKey(e.ts)}</td><td class="n">${hm(e.ts)}</td><td>${esc(e.cat ? t(e.cat) : "")}</td><td>${esc(e.name || "")}</td><td>${esc(e.dose || "")}</td><td>${esc(e.note || "")}</td></tr>`).join("")}</tbody></table>` : none}
  <p class="pfoot">${t("这里是家庭自己的备份，正式凭证仍以接种本、医院系统或学校要求的官方记录为准。")}</p></section>`;
}

const PAGES = { meal: mealPage, trend: trendPage, timeline: timelinePage, medical: medicalPage };
let printing = false;
function openPrint(kind){
  const page = PAGES[kind]; if (!page || printing) return;
  let host = document.getElementById("print");
  if (!host) { host = document.createElement("div"); host.id = "print"; document.body.appendChild(host); }
  host.innerHTML = page();
  host.lang = document.documentElement.lang;
  document.body.classList.add("printing"); printing = true;
  const done = () => { document.body.classList.remove("printing"); printing = false; };
  window.addEventListener("afterprint", done, { once: true });
  setTimeout(() => { try { window.print(); } finally { setTimeout(done, 1500); } }, 50); // some browsers never fire afterprint
}

export { openPrint, PAGES };
