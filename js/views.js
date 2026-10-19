import { aboutHTML } from "./about.js";
import { APPS, THIS_APP } from "./apps.js";
import { ask } from "./ask.js";
import { byTime, last, medStatus, suggestSide, within } from "./derived.js";
import { t } from "./i18n.js";
import { cardsHTML, settingsHTML, viewMe } from "./me.js";
import { dayNavHTML, viewMeal } from "./meal.js";
import { activeCards, doctorListHTML, milestoneRef, milestoneRefHTML, quickHTML, stageCfg, stageTypes, statsHTML } from "./stages.js";
import { CHECKUPS, S, STAGES, isKidType, ageAtText, ageText, babyAgeDays, birthTs, checkupDate, checkupDefaultDate, checkupOverride, checkupsDone, child, childOf, matchCheckup, nextCheckup, stageOf, vis } from "./state.js";
import { SB, loadTombs, memberName, memberNames } from "./sync.js";
import { viewTrend } from "./trend.js";
import { TYPES, flags, isVisit, summary, typeLabel } from "./types.js";
import { fmtU, isUS, toDisp, trim, unitOf } from "./units.js";
import { $, D, H, dayKey, dur, esc, hm, num, startOfDay, weekday } from "./util.js";

/* ============ rendering ============ */
function renderStatus(){
  const pending = S.entries.filter(e => e._dirty).length + loadTombs().length;
  $("#status").innerHTML = S.mode === "family"
    ? (pending ? `<span class="dot"></span>${t("{n} 条待同步", { n: pending })}` : `<span class="dot ok"></span>${t("家庭同步 · {n} 人", { n: memberNames().length || 1 })}`)
    : S.mode === "cloud" ? `<span class="dot ok"></span>${t("已同步到你的账号")}` : `<span class="dot"></span>${t("保存在本设备")}`;
  $("#bname").innerHTML = `${esc(child().name ? t("{name}的记录", { name: child().name }) : t("小月亮"))}<span class="chev" aria-hidden="true"></span>`;
  $("#bage").textContent = ageText();
  $("#kids").innerHTML = S.settings.children.map(c => `<button role="menuitemradio" aria-checked="${c.id === S.childId}" data-kidsel="${esc(c.id)}"><b>${esc(c.name || t("宝宝"))}</b><small>${esc(ageText(c.id))}</small></button>`).join("")
    + `<button class="manage" role="menuitem" data-act="settings">${t("管理孩子…")}</button>`;
  // sister apps in the top-right corner: ‹ previous site, next site › (wrapping); same account on all three
  const i = APPS.findIndex(a => a.key === THIS_APP), n = APPS.length, prev = APPS[(i - 1 + n) % n], next = APPS[(i + 1) % n];
  const badge = (a, label) => `<a class="badge" href="${a.url}" title="${esc(t("切到{name}", { name: t(a.name) }))}" aria-label="${esc(t("切到{name}", { name: t(a.name) }))}">${label}</a>`;
  $("#apps").innerHTML = badge(prev, `‹ ${esc(t(prev.short))}`) + badge(next, `${esc(t(next.short))} ›`);
}
function toggleKids(open = $("#kids").hidden){
  $("#kids").hidden = !open;
  $("#bname").setAttribute("aria-expanded", String(open));
  if (open) { const cur = $("#kids [aria-checked='true']"); cur && cur.focus(); }
}
// one entry row of a hub page (我的 / 成长 / 妈妈): icon, title, one-line description, ›
const mrow = (attr, title, desc, icon) => `<button class="mrow" ${attr}><span class="mi" aria-hidden="true">${icon}</span><span class="mt"><b>${title}</b>${desc ? `<small>${desc}</small>` : ""}</span><span class="mch" aria-hidden="true">›</span></button>`;
// sub-pages reached from a hub: the hub's bottom tab stays highlighted and a "‹ hub" chip sits on top
const SUB = {
  settings: ["me", () => settingsHTML()], cards: ["me", () => cardsHTML()], learn: ["me", () => viewLearn()], about: ["me", () => aboutHTML()],
  "grow-milestones": ["grow", () => growMilestones()], "grow-foods": ["grow", () => growFoods()], "grow-sleep": ["grow", () => growSleep()],
  "grow-body": ["grow", () => growBody()], "grow-checkups": ["grow", () => growCheckups()], "grow-vax": ["grow", () => growVax()],
  "mom-charts": ["mom", () => momCharts()], "mom-signs": ["mom", () => momSigns()]
};
const TAB_LABEL = { me: "我的", grow: "成长", mom: "妈妈" };
function render(){
  renderStatus();
  // the postpartum tab matters in the newborn stage, or while mother records are still being written
  const showMom = stageOf().key === "newborn" || S.entries.some(e => (e.type === "mmed" || e.type === "mbody") && e.ts > Date.now() - 30 * D);
  $('nav.tabs [data-tab="mom"]').hidden = !showMom;
  const sub = SUB[S.tab], cur = sub ? sub[0] : S.tab;
  if (cur === "mom" && !showMom) S.tab = "today";
  document.querySelectorAll("nav.tabs button").forEach(b => { if (b.dataset.tab === cur) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  const v = sub ? sub[1] : ({ today: viewToday, log: viewLog, mom: viewMom, grow: viewGrow, me: viewMe }[S.tab] || viewToday);
  const back = sub ? `<div style="margin-top:12px"><button class="chip" data-tab="${sub[0]}">‹ ${t(TAB_LABEL[sub[0]])}</button></div>` : "";
  $("#main").innerHTML = back + v();
  if (S.tab === "log") { const s = $("#q"); if (s && document.activeElement !== s && S.logFocus) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); S.logFocus = false; } }
}

function heroHTML(){
  const sl = last(e => e.type === "sleep" && !e.end);
  if (sl) return `<section class="hero sleeping" aria-live="polite"><div class="moon"></div>
    <div class="lbl">${t("宝宝已经睡了")}</div>
    <div class="big num">${bigDur(Date.now() - sl.ts)}</div>
    <div class="meta"><span>${t("{time} 入睡", { time: hm(sl.ts) })}</span>${sl.where ? `<span>${esc(t(sl.where))}</span>` : ""}</div>
    <div class="act"><button data-act="wake" data-id="${sl.id}">${t("醒了，记录结束")}</button></div></section>`;
  if (!activeCards("stats").includes("hero")) return ""; // the child's card settings turned the clock off
  if (stageCfg().hero === "companion") {
    const m = last(e => e.type === "companion");
    if (!m) return `<section class="hero"><div class="moon"></div><div class="lbl">${t("距上次陪伴")}</div>
      <div class="big num">--<small>:</small>--</div><div class="meta">${t("点下面的按钮记录一次陪伴")}</div></section>`;
    return `<section class="hero"><div class="moon"></div><div class="lbl">${t("距上次陪伴")}</div>
      <div class="big num">${bigDur(Date.now() - m.ts)}</div>
      <div class="meta"><span>${hm(m.ts)} · ${esc(summary(m))}</span></div></section>`;
  }
  if (stageCfg().hero === "meal") {
    const m = last(e => e.type === "food");
    if (!m) return `<section class="hero"><div class="moon"></div><div class="lbl">${t("距上次吃饭")}</div>
      <div class="big num">--<small>:</small>--</div><div class="meta">${t("点下面的按钮记录今天第一顿")}</div></section>`;
    return `<section class="hero"><div class="moon"></div><div class="lbl">${t("距上次吃饭")}</div>
      <div class="big num">${bigDur(Date.now() - m.ts)}</div>
      <div class="meta"><span>${hm(m.ts)} · ${esc(summary(m))}</span></div></section>`;
  }
  const f = last(e => e.type === "feed" && e.method !== "吸奶");
  if (!f) return `<section class="hero"><div class="moon"></div><div class="lbl">${t("距上次喂奶")}</div>
    <div class="big num">--<small>:</small>--</div><div class="meta">${t("点下面的按钮记录第一次喂奶")}</div></section>`;
  const side = suggestSide(f);
  return `<section class="hero"><div class="moon"></div>
    <div class="lbl">${t("距上次喂奶")}</div>
    <div class="big num">${bigDur(Date.now() - f.ts)}</div>
    <div class="meta"><span>${hm(f.ts)} · ${esc(summary(f))}</span>${side ? `<span>${t("这次建议先喂 {side}", { side: `<span class="side">${t(side)}</span>` })}</span>` : ""}</div></section>`;
}
function bigDur(ms){ const m = Math.max(0, Math.floor(ms / 60000)); const h = Math.floor(m / 60); return h ? `${h}<small>${t("小时")}</small>${m % 60}<small>${t("分")}</small>` : `${m}<small>${t("分钟")}</small>`; }

/* ---- Today: the dashboard. Order: clock → warnings and reminders → quick buttons → stats → today's entries ---- */
function viewToday(){
  const day = within(D);
  const alerts = within(2 * D).flatMap(e => flags(e).map(msg => ({ t: msg, e })));
  const nc = nextCheckup();
  const meds = medStatus();
  const today = vis().filter(e => e.ts >= startOfDay(Date.now())).sort(byTime);
  const stats = statsHTML(day);
  const checkup = nc && (nc.at < Date.now()
    ? t("儿科体检：{label}，应在 {date}（{wd}），去过了记得在成长页勾选。", { label: `<b>${t(nc.label)}</b>`, date: dayKey(nc.at), wd: weekday(nc.at) })
    : t("下次儿科体检：{label}，约 {date}（{wd}）。", { label: `<b>${t(nc.label)}</b>`, date: dayKey(nc.at), wd: weekday(nc.at) }));

  return `
  ${heroHTML()}
  ${alerts.map(a => `<div class="alert red" role="alert"><b>${t("需要留意")}</b> · ${hm(a.e.ts)} ${esc(a.t)}</div>`).join("")}
  ${nc ? `<div class="alert info">${checkup}<button class="chip" data-tab="grow-checkups" style="margin-left:6px">${t("查看全部")}</button></div>` : ""}
  <div class="quick" role="group" aria-label="${t("快速记录")}">${quickHTML()}</div>
  <div style="text-align:right"><button class="chip" data-tab="cards">${t("⚙ 管理卡片")}</button></div>
  ${stats ? `<h2>${t("最近 24 小时")}</h2><div class="stats">${stats}</div>${S.mode === "family" && SB.vis && memberNames().length > 1 ? `<p class="small muted" style="margin:6px 0 0">${t("统计只包含你能看到的记录。")}</p>` : ""}` : ""}

  ${meds.length ? `<h2>${t("妈妈用药")}</h2><div class="panel">${meds.map(medRow).join("")}
     <p class="small muted" style="margin-top:8px">${t("间隔来自你在设置里填写的医嘱。没有填写的只显示距上次服药多久。")}</p></div>` : ""}

  <h2 id="todaySec">${t("今天")}</h2>
  ${today.length ? today.map(entryRow).join("") : `<div class="empty">${t("今天还没有记录。")}</div>`}
  ${!S.entries.length ? `<div class="empty">${t("想先看看效果？")}<br><button class="btn" data-act="demo">${t("载入演示数据")}</button></div>` : ""}`;
}
function medRow(m){
  let pill = "";
  if (m.next) pill = m.next > Date.now() ? `<span class="pill wait">${t("{time} 后可再服", { time: hm(m.next) })}</span>` : `<span class="pill ok">${t("已过医嘱间隔")}</span>`;
  return `<div class="medrow"><div><b>${esc(t(m.name))}</b><div class="small muted">${t("上次 {time} · {ago}前 · 24小时内 {n} 次", { time: hm(m.at), ago: dur(Date.now() - m.at), n: m.count24 })}</div></div>${pill}</div>`;
}
function entryRow(e){
  const T = TYPES[e.type] || { color: "var(--muted)" };
  const fl = flags(e);
  const by = S.mode === "family" && e.by && memberName(e.by);
  // who can see it, for records that are not family-wide: "🔒 仅我" / "👥 指定家人" for the author, "👥 分享给你" for a recipient
  const mine = !e.cby || !SB.user || e.cby === SB.user.id;
  const vb = e.vis === "private" ? `🔒 ${t("仅我")}` : e.vis === "shared" ? `👥 ${mine ? t("指定家人") : t("分享给你")}` : "";
  return `<button class="entry ${e.id === S.flashId ? "flash" : ""}" data-edit="${e.id}">
    <span class="t">${hm(e.ts)}</span><span class="c" style="background:${T.color}" aria-hidden="true"></span>
    <span><span class="s">${esc(typeLabel(e.type))} · ${esc(summary(e))}</span>${by ? `<span class="n"> · ${esc(by)}</span>` : ""}${vb ? `<span class="n"> · ${vb}</span>` : ""}${e.note ? `<br><span class="n">${esc(e.note)}</span>` : ""}${fl.map(f => `<br><span class="n" style="color:var(--rose)">${esc(f)}</span>`).join("")}</span></button>`;
}

function viewLog(){
  const views = [["meal", t("按餐表格")], ["trend", t("趋势对比")], ["list", t("时间线")]];
  const sw = `<div class="vtabs" role="group" aria-label="${t("记录视图")}">${views.map(([k, l]) => `<button data-logview="${k}" aria-pressed="${S.logView === k}">${l}</button>`).join("")}</div>`;
  if (S.logView === "meal") return sw + viewMeal();
  if (S.logView === "trend") return sw + viewTrend();
  return sw + viewList();
}

/* timeline: one day at a time with the same ‹ date › navigation as the meal table; a search spans every day */
function viewList(){
  const q = S.q.trim().toLowerCase(), d0 = S.mealDay ?? startOfDay(Date.now());
  let list = vis().sort(byTime);
  if (!q) list = list.filter(e => e.ts >= d0 && e.ts < d0 + D);
  if (S.filter !== "all") list = list.filter(e => S.filter === "momall" ? ["mmed", "mbody"].includes(e.type) : e.type === S.filter);
  if (q) list = list.filter(e => (typeLabel(e.type) + " " + summary(e) + " " + (e.note || "") + " " + dayKey(e.ts)).toLowerCase().includes(q));
  const groups = {};
  for (const e of list) (groups[dayKey(e.ts)] ||= []).push(e);
  // the stage's types first, then any other type this child has records of, so history stays reachable after a stage change or a hidden card
  const own = new Set(vis().map(e => e.type)), extra = Object.keys(TYPES).filter(ty => isKidType(ty) && own.has(ty) && !stageTypes().includes(ty));
  const chips = [["all", t("全部")], ...[...stageTypes(), ...extra].map(ty => [ty, typeLabel(ty)]), ["momall", t("妈妈")]];
  if (!chips.some(([k]) => k === S.filter)) { S.filter = "all"; return viewList(); } // filter from another stage / child
  const body = !list.length
    ? `<div class="empty"><div class="eicon" aria-hidden="true">${q ? "🔍" : "🗓"}</div>${q ? t("没有符合条件的记录，换个关键词试试。") : S.filter !== "all" ? t("这一天没有这类记录。") : t("这一天没有记录。")}<br><button class="btn" data-act="addpick">${t("＋ 补记一条")}</button></div>`
    : q ? Object.entries(groups).map(([d, es]) => `<div class="day">${d} ${weekday(es[0].ts)} · ${t("{n} 条", { n: es.length })}</div>${es.map(entryRow).join("")}`).join("")
    : `<div class="day">${t("{n} 条", { n: list.length })}</div>${list.map(entryRow).join("")}`;
  return `${dayNavHTML(d0)}
  <input id="q" class="search" type="search" value="${esc(S.q)}" placeholder="${t("搜索备注、药名、日期（如 2026-10-11）")}" aria-label="${t("搜索备注、药名、日期（如 2026-10-11）")}" autocomplete="off">
  ${q ? `<p class="small muted" style="margin:6px 0 0">${t("搜索时显示所有日期的结果。")}</p>` : ""}
  <div class="chips" role="group" aria-label="${t("按类型筛选")}">${chips.map(([k, l]) => `<button class="chip" data-filter="${k}" aria-pressed="${S.filter === k}">${l}</button>`).join("")}</div>
  ${list.length ? `<div class="btns" style="margin-top:0"><button class="btn" data-act="addpick">${t("＋ 补记一条")}</button></div>` : ""}
  ${body}`;
}

/* ---- charts ---- */
function lineChart(points, opts){
  const W = 360, Hh = 150, P = { l: 34, r: 10, t: 12, b: 22 };
  if (points.length < 2) return `<p class="small muted">${t("至少记录两次后会显示趋势图。")}</p>`;
  const xs = points.map(p => p.t), ys = points.map(p => p.v);
  let y0 = Math.min(...ys), y1 = Math.max(...ys); if (opts.min != null) y0 = Math.min(y0, opts.min); if (opts.max != null) y1 = Math.max(y1, opts.max);
  if (y1 === y0) { y1 += 1; y0 -= 1; }
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
  const X = t => P.l + (t - x0) / ((x1 - x0) || 1) * (W - P.l - P.r), Y = v => Hh - P.b - (v - y0) / (y1 - y0) * (Hh - P.t - P.b);
  const path = points.map((p, i) => (i ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.v).toFixed(1)).join(" ");
  const fmt = v => Math.round(v * 10) / 10;
  return `<div class="scroll-x"><svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="${t("{label}：从 {a} 到 {b}{unit}", { label: esc(opts.label), a: fmt(ys[0]), b: fmt(ys[ys.length - 1]), unit: esc(opts.unit) })}">
    <line x1="${P.l}" x2="${W - P.r}" y1="${Y(y1)}" y2="${Y(y1)}" stroke="var(--line)"/><line x1="${P.l}" x2="${W - P.r}" y1="${Y(y0)}" y2="${Y(y0)}" stroke="var(--line)"/>
    <text x="4" y="${Y(y1) + 4}">${fmt(y1)}</text><text x="4" y="${Y(y0) + 4}">${fmt(y0)}</text>
    <text x="${P.l}" y="${Hh - 6}">${dayKey(x0).slice(5)}</text><text x="${W - P.r}" y="${Hh - 6}" text-anchor="end">${dayKey(x1).slice(5)}</text>
    <path d="${path}" fill="none" stroke="${opts.color}" stroke-width="2.5" stroke-linejoin="round"/>
    ${points.map(p => `<circle cx="${X(p.t)}" cy="${Y(p.v)}" r="3.5" fill="${opts.color}"/>`).join("")}</svg></div>`;
}
function sleepBarcode(){
  const W = 360, rowH = 20, gap = 6, L = 42, days = 7, now = Date.now();
  const rows = []; for (let i = 0; i < days; i++) rows.push(startOfDay(now) - i * D);
  const all = vis();
  const sleeps = all.filter(e => e.type === "sleep");
  const feeds = all.filter(e => e.type === "feed" && e.method !== "吸奶");
  const scale = (W - L - 8) / D;
  let body = "";
  rows.forEach((d0, i) => {
    const y = 18 + i * (rowH + gap);
    body += `<text x="0" y="${y + 15}">${dayKey(d0).slice(5)}</text><rect x="${L}" y="${y}" width="${W - L - 8}" height="${rowH}" rx="4" fill="var(--slate-soft)"/>`;
    for (const s of sleeps) { const a = Math.max(s.ts, d0), b = Math.min(s.end || now, d0 + D); if (b > a) body += `<rect x="${(L + (a - d0) * scale).toFixed(1)}" y="${y}" width="${Math.max(1.5, (b - a) * scale).toFixed(1)}" height="${rowH}" rx="3" fill="var(--slate)"/>`; }
    for (const f of feeds) if (f.ts >= d0 && f.ts < d0 + D) body += `<rect x="${(L + (f.ts - d0) * scale - 1).toFixed(1)}" y="${y + rowH - 6}" width="3" height="6" fill="var(--honey)"/>`;
  });
  [0, 6, 12, 18, 24].forEach(h => body += `<text x="${L + h * H * scale}" y="12" text-anchor="${h === 0 ? "start" : h === 24 ? "end" : "middle"}">${t("{h}点", { h })}</text>`);
  const total = 18 + days * (rowH + gap);
  return `<div class="scroll-x"><svg viewBox="0 0 ${W} ${total}" width="100%" role="img" aria-label="${t("最近7天睡眠时间分布图，深色为睡眠，黄色刻度为喂奶")}">${body}</svg></div>
  <div class="legend"><span style="--c:var(--slate)">${t("睡眠")}</span><span style="--c:var(--honey)">${t("喂奶")}</span></div>`;
}

/* ---- 妈妈: hub with the actionable parts (buttons, medicine timers); charts and warning signs are sub-pages ---- */
const HEAR_HER = [
  "持续不缓解或越来越重的头痛，头晕、晕厥",
  "视力变化（看东西模糊、眼前闪光）",
  "体温 38℃（100.4℉）或以上",
  "面部、手部严重肿胀",
  "有伤害自己或宝宝的想法",
  "呼吸困难、胸痛、心跳很快",
  "剧烈腹痛、持续恶心呕吐",
  "出血量大（约 1 小时浸透一片卫生巾）或排出大血块",
  "一侧腿部肿胀、发红、疼痛",
  "极度疲惫、无法照顾自己"
];
const momBodies = () => S.entries.filter(e => e.type === "mbody").sort((a, b) => a.ts - b.ts);
function viewMom(){
  const meds = medStatus(), bodies = momBodies();
  const mpts = bodies.filter(e => num(e.mood) != null).map(e => +e.mood);
  const lowMood = mpts.slice(-5).filter(v => v <= 2).length >= 3;
  const lastB = bodies[bodies.length - 1];
  return `<h2>${t("妈妈的恢复")}</h2>
  <div class="btns" style="margin-top:0"><button class="btn primary" data-add="mbody">${t("记录今天的身体状况")}</button><button class="btn" data-add="mmed">${t("记录用药")}</button></div>
  ${lowMood ? `<div class="alert info">${t("最近几次心情记录偏低。产后情绪波动很常见，但如果低落持续超过两周，或影响到吃饭、睡觉、照顾宝宝，值得和医生聊聊产后抑郁筛查（如 EPDS 量表）。")}</div>` : ""}
  <h2>${t("用药计时")}</h2>
  <div class="panel">${meds.length ? meds.map(medRow).join("") : `<p class="muted">${t("最近 48 小时没有用药记录。")}</p>`}
    <p class="small muted" style="margin-top:8px">${t("在“设置”里给每种药填上医生或说明书给的最短间隔，这里就会显示下次可以服用的时间。哺乳期用药请先确认医生的意见。")}</p></div>
  <div class="panel mlist" style="margin-top:14px">
    ${mrow('data-tab="mom-charts"', t("体重、疼痛与心情"), lastB ? t("最近一次 {date} · 共 {n} 次记录", { date: dayKey(lastB.ts), n: bodies.length }) : t("记录几次后显示曲线"), "📈")}
    ${mrow('data-tab="mom-signs"', t("需要立即就医的警示信号"), t("CDC「Hear Her」产后紧急警示信号"), "⚠")}
  </div>`;
}
function momCharts(){
  const bodies = momBodies();
  const wpts = bodies.filter(e => num(e.weight) != null).map(e => ({ t: e.ts, v: toDisp("wmom", e.weight) }));
  const ppts = bodies.filter(e => num(e.pain) != null).map(e => ({ t: e.ts, v: +e.pain }));
  const mpts = bodies.filter(e => num(e.mood) != null).map(e => ({ t: e.ts, v: +e.mood }));
  return `<h2>${t("{label}（{u}）", { label: t("体重"), u: unitOf("wmom") })}</h2><div class="panel">${lineChart(wpts, { color: "#9B7BB8", unit: unitOf("wmom"), label: t("妈妈体重") })}</div>
  <h2>${t("疼痛与心情")}</h2>
  <div class="panel"><h3 class="small muted">${t("疼痛 0–10")}</h3>${lineChart(ppts, { color: "var(--rose)", unit: "", label: t("疼痛评分"), min: 0, max: 10 })}
    <h3 class="small muted" style="margin-top:10px">${t("心情 1–5")}</h3>${lineChart(mpts, { color: "var(--sage)", unit: "", label: t("心情评分"), min: 1, max: 5 })}</div>
  <div class="btns"><button class="btn primary" data-add="mbody">${t("记录今天的身体状况")}</button></div>`;
}
function momSigns(){
  return `<h2>${t("需要立即就医的警示信号")}</h2>
  <div class="panel"><p class="small muted">${t("参考美国 CDC “Hear Her” 产后紧急警示信号。出现任何一项，请马上联系医生或去急诊。")}</p>
  <ul class="plain">${HEAR_HER.map(s => `<li>${t(s)}</li>`).join("")}</ul></div>`;
}

/* ---- 成长: hub with the stage strip and one row per topic; each topic is a sub-page ---- */
const vaxList = all => all.filter(e => e.type === "vax" || (e.type === "bmed" && e.cat === "疫苗")).sort((a, b) => a.ts - b.ts);
const newFoods = all => all.filter(e => e.type === "food" && (e.newFood || (e.reaction && e.reaction !== "无"))).sort((a, b) => a.ts - b.ts);
function viewGrow(){
  const ad = babyAgeDays();
  const cur = ad == null ? -1 : STAGES.findIndex(s => ad < s.untilDays);
  const all = vis();
  const ms = all.filter(e => e.type === "milestone").length, foods = newFoods(all).length, vax = vaxList(all).length;
  const lastW = all.filter(e => e.type === "baby" && num(e.weight) != null).sort(byTime)[0];
  const nc = nextCheckup(), ref = milestoneRef();
  return `<h2>${t("成长阶段")}</h2>
  <div class="stages">${STAGES.map((s, i) => `<div class="stage ${i === cur ? "now" : ""}"><b>${t(s.name)}</b>${t(s.range)}<ul>${s.items.map(x => `<li>${t(x)}</li>`).join("")}</ul></div>`).join("")}</div>
  <p class="small muted" style="margin-top:6px">${cur >= 0 ? t("现在是「{stage}」，首页的快捷按钮、统计和趋势指标会按阶段变化。", { stage: t(STAGES[cur].name) }) : t("在设置里填写宝宝生日后，会自动定位到当前阶段。")}</p>
  <div class="panel mlist" style="margin-top:14px">
    ${mrow('data-tab="grow-milestones"', t("发育里程碑"), ms ? t("已记录 {n} 个 · 附 CDC 月龄参考", { n: ms }) : t("记下第一次翻身、第一次叫妈妈 · 附 CDC 月龄参考"), "⭐")}
    ${mrow('data-tab="grow-foods"', t("新食物与反应"), foods ? t("{n} 条新食物或反应记录", { n: foods }) : t("第一次尝试的食物和过敏反应"), "🥣")}
    ${mrow('data-tab="grow-sleep"', t("睡眠"), t("最近 7 天分布 · 各月龄睡眠参考"), "🌙")}
    ${mrow('data-tab="grow-body"', t("体重 / 身高"), lastW ? t("最近 {w} · {date}", { w: fmtU("wbaby", lastW.weight), date: dayKey(lastW.ts) }) : t("体重、身高、头围曲线"), "📏")}
    ${mrow('data-tab="grow-checkups"', t("儿科体检与就诊"), nc ? t("下次 {label} · {date}", { label: t(nc.label), date: dayKey(nc.at) }) : t("提醒与历史记录"), "🩺")}
    ${mrow('data-tab="grow-vax"', t("疫苗接种记录"), vax ? t("共 {n} 次", { n: vax }) : t("还没有接种记录"), "💉")}
  </div>`;
}
function growMilestones(){
  const all = vis();
  return `<h2>${t("发育里程碑")}</h2>
  <div class="panel">${milestonesHTML(all)}${milestoneRefHTML()}
    <div class="btns"><button class="btn" data-add="milestone">${t("＋ 记录一个里程碑")}</button></div></div>`;
}
function growFoods(){
  return `<h2>${t("新食物与反应")}</h2><div class="panel">${foodsHTML(vis())}
    <div class="btns"><button class="btn" data-add="food" data-preset='{"newFood":true}'>${t("＋ 记录一种新食物")}</button></div></div>`;
}
function growSleep(){
  return `<h2>${t("最近 7 天睡眠")}</h2>
  <div class="panel">${sleepBarcode()}
    <p class="small muted" style="margin-top:8px">${t("每一行是一天，从 0 点到 24 点。看得出白天和夜里的睡眠慢慢分开，就是作息在形成。")}</p></div>
  <h2>${t("睡眠参考")}</h2>
  <div class="panel scroll-x"><table>
    <thead><tr><th>${t("月龄")}</th><th>${t("24小时总睡眠")}</th><th>${t("常见清醒时长")}</th></tr></thead>
    <tbody>
      <tr><td>${t("0–3 个月")}</td><td>${t("14–17 小时")}</td><td>${t("45–90 分钟")}</td></tr>
      <tr><td>${t("4–12 个月")}</td><td>${t("12–16 小时（含小睡）")}</td><td>${t("1.5–3.5 小时")}</td></tr>
      <tr><td>${t("1–2 岁")}</td><td>${t("11–14 小时（含小睡）")}</td><td>${t("3–5 小时")}</td></tr>
      <tr><td>${t("3–5 岁")}</td><td>${t("10–13 小时（含小睡）")}</td><td>${t("多数逐渐不午睡")}</td></tr>
      <tr><td>${t("6–12 岁")}</td><td>${t("9–12 小时")}</td><td>–</td></tr>
      <tr><td>${t("13–18 岁")}</td><td>${t("8–10 小时")}</td><td>–</td></tr>
    </tbody></table>
    <p class="small muted" style="margin-top:8px">${t("总睡眠：4个月以上为美国睡眠医学会（AASM）建议、AAP 认可；0–3 个月为美国国家睡眠基金会建议。清醒时长是常见经验范围，个体差异很大。安全睡眠：仰睡、独自睡在婴儿床、床里不放枕头被子毛绒玩具。多数专家建议约 4–6 个月后再考虑睡眠训练。")}</p></div>`;
}
function growBody(){
  const health = vis().filter(e => e.type === "baby").sort((a, b) => a.ts - b.ts);
  const w = health.filter(e => num(e.weight) != null).map(e => ({ t: e.ts, v: toDisp("wbaby", e.weight) }));
  const len = health.filter(e => num(e.length) != null).map(e => ({ t: e.ts, v: toDisp("len", e.length) }));
  const newborn = stageOf().key === "newborn";
  return `<h2>${t("{label}（{u}）", { label: t("体重"), u: unitOf("wbaby") })}</h2><div class="panel">${lineChart(w, { color: "var(--sky)", unit: unitOf("wbaby"), label: t("宝宝体重") })}
    <p class="small muted">${newborn ? t("新生儿出生后几天体重下降常见；通常约 10–14 天回到出生体重。") : ""}${t("是否正常请以儿科医生对照生长曲线的判断为准。")}</p>
    ${len.length >= 2 ? `<h3 class="small muted" style="margin-top:10px">${t("{label}（{u}）", { label: t("身高 / 身长"), u: unitOf("len") })}</h3>${lineChart(len, { color: "var(--sage)", unit: unitOf("len"), label: t("身高") })}` : ""}
    <div class="btns"><button class="btn" data-add="baby">${t("记录体重 / 身高 / 头围")}</button></div></div>`;
}
function growCheckups(){
  const all = vis(), done = checkupsDone();
  return `<h2>${t("儿科体检与就诊")}</h2>
  <div class="chips" role="group" aria-label="${t("体检视图")}" style="margin-top:0">
    <button class="chip" data-ckview="plan" aria-pressed="${S.checkupView !== "history"}">${t("提醒")}</button>
    <button class="chip" data-ckview="history" aria-pressed="${S.checkupView === "history"}">${t("历史记录")}</button></div>
  ${S.checkupView === "history" ? checkupHistoryHTML(all) : checkupPlanHTML(all, done)}`;
}
function growVax(){ return vaxHTML(); }
// the Bright Futures schedule, with the actual visit date next to any checkpoint that already has a clinic record
function checkupPlanHTML(all, done){
  if (!birthTs()) return `<div class="panel"><p class="muted">${t("在设置里填写宝宝生日后，会自动算出每次体检的大概日期。")}</p><button class="btn" data-act="settings">${t("去填写")}</button></div>`;
  const visits = all.filter(e => isVisit(e) && e.src === "儿科体检");
  // the date cell is editable: clinics book the visit earlier or later than the schedule, and the Today reminder follows the real appointment
  return `<div class="panel scroll-x"><table><thead><tr><th>${t("时间点")}</th><th>${t("约在")}</th><th>${t("完成")}</th></tr></thead><tbody>
    ${CHECKUPS.map(c => { const at = checkupDate(c), changed = !!checkupOverride(c); const soon = !done[c.k] && at > Date.now() - 14 * D && at < Date.now() + 21 * D;
      const v = visits.find(e => matchCheckup(e.ts, childOf(e)) === c);
      return `<tr><td>${soon ? "<b>" : ""}${t(c.label)}${soon ? "</b>" : ""}</td>
      <td class="num"><span class="ckdate ${changed ? "changed" : ""}"><input type="date" data-ckdate="${c.k}" value="${dayKey(at)}" aria-label="${t("{label} 体检日期", { label: t(c.label) })}" title="${t("改成医生实际约的日期")}">${changed ? `<button type="button" class="ckreset" data-ckreset="${c.k}" title="${t("恢复为时间表的 {date}", { date: dayKey(checkupDefaultDate(c)) })}" aria-label="${t("恢复为时间表的 {date}", { date: dayKey(checkupDefaultDate(c)) })}">↺</button>` : ""}</span>${changed ? `<br><span class="small muted">${t("已改，时间表原为 {date}", { date: dayKey(checkupDefaultDate(c)) })}</span>` : ""}${v ? `<br><button class="cellbtn small" style="all:unset;cursor:pointer;color:var(--sage)" data-edit="${v.id}">${t("已记录 {date}", { date: dayKey(v.ts) })}</button>` : ""}</td>
      <td><label class="check"><input type="checkbox" data-checkup="${c.k}" ${done[c.k] ? "checked" : ""}><span class="small">${t("已去")}</span></label></td></tr>`; }).join("")}
    </tbody></table>
    <p class="small muted" style="margin-top:8px">${t("日期可以点开改成医生实际约的日子，今天页的提醒会跟着变；↺ 恢复时间表。")}${t("时间点参考美国儿科学会 Bright Futures 体检时间表。疫苗按当地（中国 / 美国等）免疫规划和医生安排，二者时间不完全相同。")}</p></div>`;
}
// every baby-health record taken at a clinic, newest first: the visit history a parent flips back through
function checkupHistoryHTML(all){
  const list = all.filter(isVisit).sort((a, b) => b.ts - a.ts);
  const meas = e => [e.temp && `${t("体温")} ${fmtU("temp", e.temp)}`, e.weight && `${t("体重")} ${fmtU("wbaby", e.weight)}`, e.length && `${t("身长")} ${fmtU("len", e.length)}`, e.head && `${t("头围")} ${fmtU("len", e.head)}`].filter(Boolean).join(" · ");
  return `<div class="panel">
    ${list.length ? `<div class="scroll-x"><table><thead><tr><th>${t("日期")}</th><th>${t("类型")}</th><th>${t("测量")}</th></tr></thead><tbody>
      ${list.map(e => { const m = e.src === "儿科体检" ? matchCheckup(e.ts, childOf(e)) : null;
        return `<tr><td class="num"><button class="cellbtn" style="all:unset;cursor:pointer" data-edit="${e.id}" aria-label="${t("修改 {date} 的记录", { date: dayKey(e.ts) })}">${dayKey(e.ts)}</button><br><span class="small muted">${ageAtText(e.ts)}</span></td>
        <td>${esc(t(e.src))}${m ? `<br><span class="small muted">${t(m.label)}</span>` : ""}${e.clinic ? `<br><span class="small muted">${esc(e.clinic)}</span>` : ""}</td>
        <td>${esc(meas(e))}${e.note ? `<br><span class="small muted">${esc(e.note)}</span>` : ""}</td></tr>`; }).join("")}
    </tbody></table></div><p class="small muted" style="margin-top:6px">${t("共 {n} 次。点日期可修改。", { n: list.length })}</p>`
    : `<p class="muted">${t("还没有体检或就诊记录。记录宝宝健康时把来源选成“儿科体检”或“看病/急诊”，就会出现在这里。")}</p>`}
    <div class="btns"><button class="btn" data-add="baby" data-preset='{"src":"儿科体检"}'>${t("＋ 记录一次体检")}</button><button class="btn" data-add="baby" data-preset='{"src":"看病/急诊"}'>${t("＋ 记录一次看病")}</button></div>
  </div>`;
}
function milestonesHTML(all){
  const list = all.filter(e => e.type === "milestone").sort((a, b) => a.ts - b.ts);
  if (!list.length) return `<p class="muted">${t("还没有记录里程碑。第一次翻身、第一次叫妈妈，记下日期以后很难忘。")}</p>`;
  return `<div class="scroll-x"><table><thead><tr><th>${t("日期")}</th><th>${t("类别")}</th><th>${t("做到了")}</th></tr></thead><tbody>
    ${list.map(e => `<tr><td class="num"><button class="cellbtn" style="all:unset;cursor:pointer" data-edit="${e.id}" aria-label="${t("修改 {date} 的里程碑", { date: dayKey(e.ts) })}">${dayKey(e.ts)}</button><br><span class="small muted">${ageAtText(e.ts)}</span></td><td>${esc(e.cat ? t(e.cat) : "")}</td><td>${esc(e.name || "")}${e.note ? `<br><span class="small muted">${esc(e.note)}</span>` : ""}</td></tr>`).join("")}
  </tbody></table></div><p class="small muted" style="margin-top:6px">${t("共 {n} 个。点日期可修改。", { n: list.length })}</p>`;
}
// first-time foods and any reactions: the allergy log a pediatrician asks for
function foodsHTML(all){
  const foods = newFoods(all);
  if (!foods.length) return `<p class="muted">${t("还没有新食物记录。记录饮食时勾上“第一次尝试的新食物”或填写反应，就会出现在这里。")}</p>`;
  return `<div class="scroll-x"><table><thead><tr><th>${t("日期")}</th><th>${t("食物")}</th><th>${t("反应")}</th></tr></thead><tbody>
    ${foods.map(e => `<tr><td class="num"><button class="cellbtn" style="all:unset;cursor:pointer" data-edit="${e.id}" aria-label="${t("修改 {date} 的饮食记录", { date: dayKey(e.ts) })}">${dayKey(e.ts)}</button></td><td>${esc(e.foods || "")}${e.newFood ? ` <span class="small muted">${t("新")}</span>` : ""}</td><td${e.reaction && e.reaction !== "无" && e.reaction !== "拒绝" ? ' style="color:var(--rose)"' : ""}>${esc(t(e.reaction || "无"))}</td></tr>`).join("")}
  </tbody></table></div><p class="small muted" style="margin-top:6px">${t("只列出勾了“第一次尝试”或有反应的记录。新食物建议一次只加一种、连续观察 2–3 天，以医生建议为准。")}</p>`;
}
function vaxHTML(){
  const list = vaxList(vis());
  return `<h2>${t("疫苗接种记录")}</h2>
  <div class="panel">
    ${list.length ? `<div class="scroll-x"><table><thead><tr><th>${t("日期")}</th><th>${t("疫苗")}</th><th>${t("剂次")}</th><th>${t("部位")}</th><th>${t("反应")}</th></tr></thead><tbody>
      ${list.map(e => `<tr><td class="num"><button class="cellbtn" style="all:unset;cursor:pointer" data-edit="${e.id}" aria-label="${t("修改 {date} 的接种记录", { date: dayKey(e.ts) })}">${dayKey(e.ts)}</button><br><span class="small muted">${ageAtText(e.ts)}</span></td>
        <td>${esc(e.name || (e.cat ? t(e.cat) : ""))}</td><td>${esc(e.dose ? t(e.dose) : "")}</td><td>${esc(e.site ? t(e.site) : "")}</td><td>${esc(e.reaction ? t(e.reaction) : "")}</td></tr>`).join("")}
    </tbody></table></div><p class="small muted" style="margin-top:6px">${t("共 {n} 次。点日期可修改。", { n: list.length })}</p>`
    : `<p class="muted">${t("还没有接种记录。打完疫苗后记一笔，看儿科或办入学时翻出来很方便。")}</p>`}
    <div class="btns"><button class="btn" data-add="vax">${t("＋ 记录一次接种")}</button></div>
    <p class="small muted" style="margin-top:8px">${t("这里是家庭自己的备份，正式凭证仍以接种本、医院系统或学校要求的官方记录为准。")}</p>
  </div>`;
}

function viewLearn(){
  const EG = {
    newborn: "“宝宝打嗝很多正常吗？”“产后多久可以开始运动？”", infant: "“辅食先加什么？”“几个月可以睡整夜？”",
    school: "“孩子不愿意写作业怎么办？”“怎么和孩子聊学校里的烦恼？”", teen: "“青春期孩子不愿意说话怎么办？”“怎么管手机又不吵架？”"
  };
  const eg = t(EG[stageOf().key] || "“发脾气怎么办？”“如厕训练什么时候开始？”");
  return `<h2>${t("什么时候要联系儿科医生")}</h2>
  <div class="panel">${doctorListHTML()}<p class="small muted">${t("整理自美国儿科学会家长网站 HealthyChildren.org 的常见建议，按当前阶段显示。不确定时，打电话问医生总是对的。")}</p></div>

  <h2>${t("问一个问题")}</h2>
  <div class="panel ask">${S.sample ? `
    <label for="askq" class="small muted">${t("比如：{eg}", { eg })}</label>
    <textarea id="askq" placeholder="${t("输入你的问题…")}"></textarea>
    <div class="btns"><button class="btn primary" data-act="ask">${t("提问")}</button></div>
    <div class="answer" id="answer" aria-live="polite"></div>
    <p class="small muted" style="margin-top:8px">${t("回答由 AI 生成，只作一般信息参考，不能代替医生诊断。")}</p>`
    : `<p class="muted">${t("在线问答在当前打开方式下不可用。可以先查看下方的权威网站。")}</p>`}</div>

  <h2>${t("权威资料")}</h2>
  <div class="panel"><ul class="plain">
    <li><a href="https://www.healthychildren.org" target="_blank" rel="noopener">HealthyChildren.org</a>${t("（美国儿科学会家长站，有中文版部分内容）")}</li>
    <li><a href="https://www.cdc.gov/ncbddd/actearly/milestones/index.html" target="_blank" rel="noopener">${t("CDC 发育里程碑 Learn the Signs. Act Early.")}</a></li>
    <li><a href="https://www.cdc.gov/hearher/" target="_blank" rel="noopener">${t("CDC Hear Her 产后警示信号")}</a></li>
    <li><a href="https://www.who.int/health-topics/breastfeeding" target="_blank" rel="noopener">${t("WHO 母乳喂养")}</a></li>
    <li><a href="https://www.who.int/tools/child-growth-standards" target="_blank" rel="noopener">${t("WHO 儿童生长标准曲线")}</a></li>
  </ul></div>

  <h2>${t("微信公众号")}</h2>
  <div class="panel"><p class="small muted">${t("网页无法直接搜索公众号。点“复制”后到微信里搜索。内容质量请自行判断，医疗问题以医生意见为准。")}</p>
    ${["丁香妈妈", "崔玉涛育学园", "年糕妈妈"].map(n => `<div class="medrow"><span>${n}</span><button class="chip" data-copy="${n}">${t("复制名称")}</button></div>`).join("")}</div>`;
}

export { renderStatus, render, toggleKids, mrow, SUB, heroHTML, bigDur, viewToday, medRow, entryRow, viewLog, viewList, lineChart, sleepBarcode, viewMom, viewGrow, milestonesHTML, foodsHTML, vaxHTML, viewLearn };
