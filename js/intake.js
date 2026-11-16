import { aiReady, askText } from "./ai.js";
import { t } from "./i18n.js";
import { EXTRA, EXTRA_KEYS, INTAKE_SYSTEM, VAX_NAMES, extraParts, mergeInto, parseIntake, sameEntry, sameVisit } from "./intake-lib.js";
import { attachHTML, attachHas, attachPayload, attachReset } from "./attach.js";
import { closeSheet, head, showSheet } from "./sheet.js";
import { LS_KEY, S, ageMonths, childName, childOf, matchCheckup } from "./state.js";
import { putEntry, saveSettings } from "./store.js";
import { TYPES } from "./types.js";
import { DISP_DEC, fromDisp, toDisp, trim, unitOf } from "./units.js";
import { $, dayKey, esc, fromInput, newId, toInput, toast } from "./util.js";

/* ============ AI 一次录入体检 / 就诊（2026-11-11） ============
   一次体检常常同时有体征、疫苗、医生的总结、开的维生素 / 药、医生看到的里程碑。以前要分开记好几张表；
   现在拍就诊小结 / 疫苗本（可多张），或者打 / 粘贴一段话，AI 读出来（js/intake-lib.js），这里列成一张核对表：
   体征和医生总结 → 一条「宝宝健康」（来源 = 儿科体检 / 看病急诊）；每一针 → 一条「疫苗接种」；每种药 → 一条「宝宝用药」；每个里程碑 → 一条「里程碑」。
   每一项可以改、可以取消勾选；不想用 AI 也能直接在这张表里一次填完。保存后同样会勾上体检时间表里对应的那一次。
   照片只在浏览器里压缩后发给用户自己设置的 AI，不保存；不发姓名。入口：成长页、儿科体检与就诊、疫苗接种记录。 */
const OK_KEY = LS_KEY + ".intakeOk", ATT = "bl-intake";
let X = null;   // 这张表的草稿
const optsOf = (type, k) => (TYPES[type].fields.find(f => f.k === k) || {}).opts || [];
const VITALS = [["weight", "体重", "wbaby"], ["length", "身长", "len"], ["head", "头围", "len"], ["temp", "体温", "temp"]];

function openIntake(src){
  X = { src: src || "儿科体检", ts: Date.now(), child: S.childId, clinic: "", doctor: "", note: "", weight: null, length: null, head: null, temp: null,
    ...Object.fromEntries(EXTRA_KEYS.map(k => [k, null])), more: false, vaccines: [], meds: [], milestones: [], rows: [], read: false, busy: false };
  attachReset(ATT);
  draw(); showSheet("form");
}
const sel = (k, opts, v, label) => `<select data-ixk="${k}" aria-label="${esc(label)}"><option value="">${esc(t(label))}</option>${opts.map(o => `<option value="${esc(o)}" ${o === v ? "selected" : ""}>${esc(t(o))}</option>`).join("")}</select>`;
function draw(){
  const nowMax = toInput(Date.now());
  const vit = VITALS.map(([k, l, dim]) => { const dv = X[k] == null ? "" : trim(toDisp(dim, X[k]), DISP_DEC[dim]);
    return `<div class="field"><label for="ix_${k}">${t("{label}（{u}）", { label: t(l), u: unitOf(dim) })}</label><input id="ix_${k}" type="number" inputmode="decimal" step="any" min="0" data-ixf="${k}" data-dim="${dim}" data-orig="${dv}" value="${dv}"></div>`; }).join("");
  // 两岁以后的体检单：BMI、血压、心率、同龄百分位（没有单位换算）；小宝宝默认收起，读到了或点开才显示
  const more = EXTRA.map(([k, , , , , l]) => `<div class="field"><label for="ix_${k}">${t(l)}</label><input id="ix_${k}" type="number" inputmode="decimal" step="any" min="0" data-ixf="${k}" data-n="1" value="${X[k] ?? ""}"></div>`).join("");
  const showMore = X.more || EXTRA_KEYS.some(k => X[k] != null) || (ageMonths(X.child) ?? 0) >= 24;
  const upd = !!sameVisit(mine("baby"), dayKey(X.ts));
  const seenNote = o => (o.seen ? `<span class="small muted ix-note">${t("已经记过，勾上就更新那一条")}</span>` : "");
  const row = (list, i, inner) => `<div class="ix-row ${list[i].on ? "" : "off"}"><label class="check ix-on"><input type="checkbox" data-ixon="${i}" ${list[i].on ? "checked" : ""} aria-label="${esc(t("保存这一条"))}"></label><div class="ix-cells">${inner}${seenNote(list[i])}</div></div>`;
  const today = dayKey(Date.now());
  const vax = X.vaccines.map((v, i) => row(X.vaccines, i, `<input type="text" list="ixvax" data-ixk="name" value="${esc(v.name)}" aria-label="${esc(t("疫苗名称"))}" placeholder="${esc(t("疫苗名称"))}">
    <input type="date" data-ixk="day" value="${esc(v.day || "")}" max="${today}" aria-label="${esc(t("接种日期（空着就用上面的时间）"))}" title="${esc(t("接种日期（空着就用上面的时间）"))}">
    ${sel("dose", optsOf("vax", "dose"), v.dose, "剂次")}${sel("site", optsOf("vax", "site"), v.site, "接种部位")}`)).join("");
  const meds = X.meds.map((m, i) => row(X.meds, i, `${sel("cat", optsOf("bmed", "cat"), m.cat, "类别")}<input type="text" data-ixk="name" value="${esc(m.name)}" aria-label="${esc(t("名称"))}" placeholder="${esc(t("名称"))}">
    <input type="text" data-ixk="dose" value="${esc(m.dose)}" aria-label="${esc(t("剂量（按医嘱/说明书）"))}" placeholder="${esc(t("剂量"))}">`)).join("");
  const ms = X.milestones.map((m, i) => row(X.milestones, i, `${sel("cat", optsOf("milestone", "cat"), m.cat, "类别")}<input type="text" data-ixk="name" value="${esc(m.name)}" aria-label="${esc(t("做到了什么"))}" placeholder="${esc(t("做到了什么"))}">`)).join("");
  // 表格里的多次测量：每个日期一行（日期 + 体重 / 身长 / 头围，BMI、血压这些照读到的存）
  const dv = (dim, v) => (v === "" || v == null ? "" : v);
  const tbl = X.rows.map((x, i) => row(X.rows, i, `<input type="date" data-ixk="day" value="${esc(x.day)}" max="${today}" aria-label="${esc(t("日期"))}">
    ${[["w", "体重", "wbaby"], ["l", "身长", "len"], ["h", "头围", "len"]].map(([k, l, dim]) => `<input type="number" inputmode="decimal" step="any" min="0" data-ixk="${k}" value="${esc(dv(dim, x[k]))}" placeholder="${esc(`${t(l)} ${unitOf(dim)}`)}" aria-label="${esc(`${t(l)} ${unitOf(dim)}`)}">`).join("")}
    ${Object.keys(x.ex || {}).length ? `<span class="small muted ix-note">${esc(extraParts(x.ex).map(([l, v]) => `${t(l)} ${v}`).join(" · "))}</span>` : ""}`)).join("");
  const n = count();
  const read = `<div class="panel ix-read"><p class="small muted" style="margin:0 0 8px">${t("拍就诊小结、体检单或疫苗本（可多张），或者打 / 粘贴一段话：量了多少、打了什么针、医生说了什么。AI 读出来后在下面核对，一次保存成几条记录。")}</p>
    ${attachHTML(ATT, { t, esc, textLabel: t("或者打字 / 粘贴"), ph: t("例：体重 9.2 kg，身长 74 cm，打了百白破第3剂、乙肝第3剂（左大腿），医生说发育正常，继续每天维生素 D 400IU，下次 12 个月来") })}
    <div class="btns" style="margin-top:0"><button type="button" class="btn primary" data-ix="read" ${X.busy ? "disabled" : ""}>${X.busy ? t("正在读取…") : `✦ ${t("让 AI 读出来")}`}</button>${X.read ? "" : `<button type="button" class="btn" data-ix="manual">${t("不用 AI，直接填")}</button>`}</div>
    <p class="small muted" style="margin:6px 0 0">${aiReady() ? t("照片只在浏览器里压缩后发给你自己设置的 AI，不保存；不发孩子的名字。读出来的内容请核对。") : t("还没填 API key，去 设置 → AI 助手")}</p></div>`;
  const form = !X.read ? "" : `
    <div class="field"><div class="lab" id="ix_src">${t("记录来源")}</div><div class="seg" role="group" aria-labelledby="ix_src">${["儿科体检", "看病/急诊"].map(o => `<button type="button" data-ix="src" data-v="${o}" aria-pressed="${X.src === o}">${t(o)}</button>`).join("")}</div></div>
    <div class="ix-two ix-where"><div class="field"><label for="ix_ts">${t("时间")}</label><input id="ix_ts" type="datetime-local" data-ixf="ts" max="${nowMax}" value="${toInput(X.ts)}"></div>
      <div class="field"><label for="ix_clinic">${t("医院 / 诊所")}</label><input id="ix_clinic" type="text" data-ixf="clinic" autocomplete="off" value="${esc(X.clinic)}"></div><div class="field"><label for="ix_doctor">${t("医生")}</label><input id="ix_doctor" type="text" data-ixf="doctor" autocomplete="off" placeholder="${esc(t("如 Dr. Lee"))}" value="${esc(X.doctor || "")}"></div></div>
    ${upd ? `<p class="small muted ix-upd" role="status">${t("这一天已经有一条体检 / 就诊记录：保存时会更新那一条，补上新读到的数，不会多记一条。")}</p>` : ""}
    <h3 class="ix-h">🌡 ${t("体征")}</h3><div class="ix-vitals">${vit}</div>
    ${showMore ? `<h3 class="ix-h">❤️ ${t("BMI、血压、百分位")}</h3><div class="ix-vitals">${more}</div>` : `<div class="ix-more"><button type="button" class="chip" data-ix="more">＋ ${t("BMI、血压、心率、百分位")}</button></div>`}
    <div class="field"><label for="ix_note">${t("医生的总结 / 建议")}</label><textarea id="ix_note" data-ixf="note" placeholder="${esc(t("医生说了什么、要注意什么、下次什么时候来…"))}">${esc(X.note)}</textarea></div>
    <h3 class="ix-h">💉 ${t("疫苗")} <button type="button" class="chip" data-ix="add-vax">＋ ${t("加一针")}</button></h3><div class="ix-list" data-ixlist="vaccines">${vax || `<p class="small muted">${t("这次没有打针就留空。")}</p>`}</div>
    <h3 class="ix-h">💧 ${t("维生素 / 用药")} <button type="button" class="chip" data-ix="add-med">＋ ${t("加一种")}</button></h3><div class="ix-list" data-ixlist="meds">${meds || `<p class="small muted">${t("医生开了维生素 D、铁剂或药，就加在这里。")}</p>`}</div>
    <h3 class="ix-h">⭐ ${t("里程碑")} <button type="button" class="chip" data-ix="add-ms">＋ ${t("加一个")}</button></h3><div class="ix-list" data-ixlist="milestones">${ms || `<p class="small muted">${t("医生提到会翻身、会走、会说话了，可以顺手记下。")}</p>`}</div>
    ${X.rows.length ? `<h3 class="ix-h">📋 ${t("多次测量（表格里每个日期一条）")} <span class="small muted">${t("{n} 行", { n: X.rows.length })}</span></h3><div class="ix-list" data-ixlist="rows">${tbl}</div>` : ""}
    ${X.temp >= 38 ? `<div class="warnline" role="alert">${esc(t("发热：留意精神状态，按医生建议处理"))}</div>` : ""}
    <div class="btns"><button type="button" class="btn primary" data-ix="save" ${n ? "" : "disabled"}>${n ? t("保存 {n} 条", { n }) : t("还没有要保存的")}</button><button type="button" class="btn" data-act="close">${t("取消")}</button></div>`;
  $("#sheetIn").innerHTML = `${head(`✦ ${t("AI 一次录入体检 / 就诊")}`)}
    <div class="field who"><span class="small muted">${t("记录给")}</span><b>${esc(childName(X.child))}</b></div>
    ${read}${form}<datalist id="ixvax">${VAX_NAMES.map(v => `<option value="${esc(t(v))}">`).join("")}</datalist>`;
}
/** 表上现在的内容读回草稿（每次重画前都读，打了一半的字不会丢） */
function readIx(){
  const box = $("#sheetIn"); if (!box || !X) return;
  box.querySelectorAll("[data-ixf]").forEach(el => {
    const k = el.dataset.ixf;
    if (k === "ts") { const v = fromInput(el.value); if (v) X.ts = v; }
    else if (el.dataset.dim) { if (el.value !== el.dataset.orig) X[k] = fromDisp(el.dataset.dim, el.value); }
    else if (el.dataset.n) X[k] = el.value === "" || !(+el.value > 0) ? null : +el.value;
    else X[k] = el.value;
  });
  box.querySelectorAll("[data-ixlist]").forEach(list => {
    const arr = X[list.dataset.ixlist];
    list.querySelectorAll(".ix-row").forEach((r, i) => { const o = arr[i]; if (!o) return;
      o.on = r.querySelector("[data-ixon]").checked;
      r.querySelectorAll("[data-ixk]").forEach(el => { o[el.dataset.ixk] = el.value.trim(); }); });
  });
}
const keepVitals = () => VITALS.some(([k]) => X[k] != null) || EXTRA_KEYS.some(k => X[k] != null) || X.note.trim() || X.clinic.trim() || X.doctor.trim();
/** 这个孩子的某类记录（找「已经记过的同一条」用） */
const mine = type => S.entries.filter(e => e.type === type && !e.deleted && childOf(e) === X.child);
const rowOk = x => x.on && /^\d{4}-\d{2}-\d{2}$/.test(x.day || "") && (x.w || x.l || x.h || Object.keys(x.ex || {}).length);
/** 那一天已经有的「宝宝健康」（不管是体检还是在家量的） */
const sameDay = d => mine("baby").find(e => dayKey(e.ts) === d) || null;
const count = () => (keepVitals() ? 1 : 0) + X.vaccines.filter(v => v.on && v.name).length + X.meds.filter(m => m.on && m.name).length + X.milestones.filter(m => m.on && m.name).length + X.rows.filter(rowOk).length;

/* ---- AI ---- */
async function aiRead(){
  readIx();
  if (!attachHas(ATT)) { toast(t("先拍照 / 选图片，或者打一段话")); return; }
  if (!aiReady()) { toast(t("还没填 API key，去 设置 → AI 助手")); return; }
  let ok = false; try { ok = localStorage.getItem(OK_KEY) === "1"; } catch (e) {}
  if (!ok) {
    if (!confirm(t("照片和文字会发给你自己设置的 AI 服务商来读取（提示里要求它不要读姓名、生日、地址）；小月亮不保存照片。继续吗？"))) return;
    try { localStorage.setItem(OK_KEY, "1"); } catch (e) {}
  }
  X.busy = true; draw();
  try {
    const { images, text } = attachPayload(ATT);   // 照片 / PDF + 文字框和文字文件（js/attach.js）
    const user = `Read this pediatric visit.${text ? "\nParent's notes:\n" + text.slice(0, 12000) : ""}`;
    const r = parseIntake(await askText(INTAKE_SYSTEM, user, { json: true, images, maxTokens: 6000 }));
    if (!r) throw new Error(t("没读出内容，换一张清楚点的照片或多写几句试试"));
    if (!X) return;   // 读的时候表被关了
    readIx();
    if (r.day) { const d = new Date(r.day + "T09:00:00").getTime(); if (d <= Date.now()) X.ts = d; }
    if (r.src) X.src = r.src;
    for (const k of ["weight", "length", "head", "temp", ...EXTRA_KEYS]) if (r[k] != null) X[k] = r[k];
    if (r.clinic) X.clinic = r.clinic;
    if (r.doctor) X.doctor = r.doctor;
    const next = r.next ? t("下次：{s}", { s: r.next }) : "";
    if (r.note || next) X.note = [X.note.trim(), r.note, next].filter(Boolean).join("\n");
    // 疫苗本：每一针带自己的日期。已经记过的（同一天同一种针 / 同一天同一种药 / 同一个里程碑）和还没到日子的默认不勾，免得记重；
    // 勾上的话保存时更新那一条（补上剂次、部位等），也不会多一条
    const today = dayKey(Date.now()), visit = dayKey(X.ts);
    X.vaccines.push(...r.vaccines.map(v => { const seen = !!sameEntry(mine("vax"), v.name, v.day || visit), later = !!v.day && v.day > today;
      return { on: !seen && !later, seen, name: v.name, day: later ? "" : v.day || "", dose: v.dose || "", site: v.site || "" }; }));
    X.meds.push(...r.meds.map(m => { const seen = !!sameEntry(mine("bmed"), m.name, visit); return { on: !seen, seen, cat: m.cat, name: m.name, dose: m.dose }; }));
    X.milestones.push(...r.milestones.map(m => { const seen = !!sameEntry(mine("milestone"), m.name, null); return { on: !seen, seen, cat: m.cat, name: m.name }; }));
    // 表格：每个日期一行体征；那天已经有记录的默认不勾（勾上 = 补进那一条）
    const disp = (dim, v) => (v == null ? "" : String(trim(toDisp(dim, v), DISP_DEC[dim])));
    X.rows.push(...r.rows.map(x => { const seen = !!sameDay(x.day);
      return { on: !seen, seen, day: x.day, src: x.src || "", w: disp("wbaby", x.weight), l: disp("len", x.length), h: disp("len", x.head), temp: x.temp, ex: Object.fromEntries(EXTRA_KEYS.filter(k => x[k] != null).map(k => [k, x[k]])) }; }));
    X.read = true;
    const skip = [...X.vaccines, ...X.meds, ...X.milestones, ...X.rows].filter(v => v.seen).length;
    toast((skip ? t("读出来了，请核对（{n} 条已经记过，没勾）", { n: skip }) : t("读出来了，请核对")) + (r.labs.length ? ` · ${t("读到 {n} 项化验：小月亮不存化验，在家庭学堂「成长 → 化验」里用 AI 录入能存下来", { n: r.labs.length })}` : ""));
  } catch (e) { toast(t("读取失败：{msg}", { msg: String(e.message || e).slice(0, 100) })); }
  finally { if (X) { X.busy = false; draw(); } }
}

/* ---- 保存：一条宝宝健康 + 每一针 + 每种药 + 每个里程碑，时间相同 ---- */
async function save(){
  readIx();
  if (X.ts > Date.now() + 60000) { toast(t("时间不能晚于现在")); return; }
  const vaxTs = v => (v.day ? new Date(v.day + "T09:00:00").getTime() : X.ts);   // 疫苗本里每针自己的日期
  if (X.vaccines.some(v => v.on && v.name && !(vaxTs(v) <= Date.now() + 60000))) { toast(t("接种日期不能晚于今天")); return; }
  const base = { ts: X.ts, child: X.child }, clinic = X.clinic.trim(), doctor = X.doctor.trim(), rows = [], visit = dayKey(X.ts);
  // 已经记过的同一条（同一天的体检 / 就诊、同一天同一种针或药、同一个里程碑）：更新它，新读到的数盖上去、没读到的保留，不多记一条；
  // 它原来的 id、时间、反应、备注不动
  const upsert = (e, old, ...drop) => (old ? { ...mergeInto(old, Object.fromEntries(Object.entries(e).filter(([k]) => !drop.includes(k) && k !== "id" && k !== "ts"))), _upd: 1 } : e);
  if (keepVitals()) rows.push(upsert({ ...base, id: newId(), type: "baby", src: X.src, clinic, doctor, ...Object.fromEntries([...VITALS.map(([k]) => k), ...EXTRA_KEYS].map(k => [k, X[k] ?? null]).filter(([, v]) => v != null)), note: X.note.trim() }, sameVisit(mine("baby"), visit)));
  // 表格里的每个日期：和这次就诊同一天的并进上面那一条；其他日期各一条（那天已有记录就补进去）
  const visitRow = rows[0];
  for (const x of X.rows.filter(rowOk)) {
    const ts = new Date(x.day + "T09:00:00").getTime(); if (ts > Date.now()) { toast(t("日期不能晚于今天")); return; }
    const vals = Object.fromEntries(Object.entries({ weight: fromDisp("wbaby", x.w), length: fromDisp("len", x.l), head: fromDisp("len", x.h), temp: x.temp, ...x.ex }).filter(([, v]) => v != null && v !== ""));
    if (visitRow && x.day === visit) { for (const [k, v] of Object.entries(vals)) if (visitRow[k] == null) visitRow[k] = v; continue; }
    rows.push(upsert({ child: X.child, ts, id: newId(), type: "baby", src: x.src || X.src, ...vals }, sameDay(x.day)));
  }
  for (const v of X.vaccines) if (v.on && v.name) rows.push(upsert({ ...base, ts: vaxTs(v), id: newId(), type: "vax", name: v.name, dose: v.dose || undefined, site: v.site || undefined, clinic, doctor, reaction: "无" }, sameEntry(mine("vax"), v.name, dayKey(vaxTs(v))), "reaction"));
  for (const m of X.meds) if (m.on && m.name) rows.push(upsert({ ...base, id: newId(), type: "bmed", cat: m.cat || "药物", name: m.name, dose: m.dose, note: t("{src}时医生开的", { src: t(X.src) }) }, sameEntry(mine("bmed"), m.name, visit), "note"));
  for (const m of X.milestones) if (m.on && m.name) rows.push(upsert({ ...base, id: newId(), type: "milestone", cat: m.cat || "认知", name: m.name, note: t("{src}时医生看到的", { src: t(X.src) }) }, sameEntry(mine("milestone"), m.name, null), "note"));
  if (!rows.length) return;
  const src = X.src, cid = X.child, ts = X.ts;
  closeSheet(); X = null;
  const upd = rows.filter(e => e._upd).length;
  for (const e of rows) { delete e._upd; for (const k of Object.keys(e)) if (e[k] === undefined || e[k] === "") delete e[k]; await putEntry(e); }
  // 和单独记一次体检一样：勾上时间表里对应的那一次
  if (src === "儿科体检") { const c = matchCheckup(ts, cid), done = (S.settings.checkups || {})[cid] || {};
    if (c && !done[c.k]) { S.settings.checkups = { ...S.settings.checkups, [cid]: { ...done, [c.k]: true } }; await saveSettings(); toast(t("已保存 {n} 条，并勾选了 {label} 体检", { n: rows.length, label: t(c.label) })); return; } }
  toast(upd ? t("已保存 {n} 条（其中 {u} 条是更新已有的）", { n: rows.length, u: upd }) : t("已保存 {n} 条", { n: rows.length }));
}

document.addEventListener("click", async ev => {
  const b = ev.target.closest("[data-ix]"); if (!b) return;
  const act = b.dataset.ix;
  if (act === "open") { openIntake(b.dataset.src); return; }
  if (!X) return;
  readIx();
  switch (act) {
    case "read": await aiRead(); return;
    case "manual": X.read = true; break;
    case "src": X.src = b.dataset.v; break;
    case "more": X.more = true; break;
    case "add-vax": X.vaccines.push({ on: true, name: "", day: "", dose: "", site: "" }); break;
    case "add-med": X.meds.push({ on: true, cat: "维生素D", name: "", dose: "" }); break;
    case "add-ms": X.milestones.push({ on: true, cat: "大运动", name: "" }); break;
    case "save": await save(); return;
  }
  draw();
});
// 勾选 / 改了数字：保存按钮上的条数跟着变（不重画整张表，光标不跳）
document.addEventListener("change", ev => {
  if (!X || !ev.target.closest || !ev.target.closest("#sheetIn") || !$("#sheetIn [data-ix=save]")) return;
  readIx(); const n = count(), btn = $("#sheetIn [data-ix=save]");
  btn.disabled = !n; btn.textContent = n ? t("保存 {n} 条", { n }) : t("还没有要保存的");
  const row = ev.target.closest(".ix-row"); if (row && ev.target.matches("[data-ixon]")) row.classList.toggle("off", !ev.target.checked);
});

export { openIntake };
