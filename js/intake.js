import { aiReady, askText } from "./ai.js";
import { t } from "./i18n.js";
import { INTAKE_SYSTEM, VAX_NAMES, parseIntake } from "./intake-lib.js";
import { attachHTML, attachHas, attachPayload, attachReset } from "./attach.js";
import { closeSheet, head, showSheet } from "./sheet.js";
import { LS_KEY, S, childName, matchCheckup } from "./state.js";
import { putEntry, saveSettings } from "./store.js";
import { TYPES } from "./types.js";
import { DISP_DEC, fromDisp, toDisp, trim, unitOf } from "./units.js";
import { $, esc, fromInput, newId, toInput, toast } from "./util.js";

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
  X = { src: src || "儿科体检", ts: Date.now(), child: S.childId, clinic: "", note: "", weight: null, length: null, head: null, temp: null,
    vaccines: [], meds: [], milestones: [], read: false, busy: false };
  attachReset(ATT);
  draw(); showSheet("form");
}
const sel = (k, opts, v, label) => `<select data-ixk="${k}" aria-label="${esc(label)}"><option value="">${esc(t(label))}</option>${opts.map(o => `<option value="${esc(o)}" ${o === v ? "selected" : ""}>${esc(t(o))}</option>`).join("")}</select>`;
function draw(){
  const nowMax = toInput(Date.now());
  const vit = VITALS.map(([k, l, dim]) => { const dv = X[k] == null ? "" : trim(toDisp(dim, X[k]), DISP_DEC[dim]);
    return `<div class="field"><label for="ix_${k}">${t("{label}（{u}）", { label: t(l), u: unitOf(dim) })}</label><input id="ix_${k}" type="number" inputmode="decimal" step="any" min="0" data-ixf="${k}" data-dim="${dim}" data-orig="${dv}" value="${dv}"></div>`; }).join("");
  const row = (list, i, inner) => `<div class="ix-row ${list[i].on ? "" : "off"}"><label class="check ix-on"><input type="checkbox" data-ixon="${i}" ${list[i].on ? "checked" : ""} aria-label="${esc(t("保存这一条"))}"></label><div class="ix-cells">${inner}</div></div>`;
  const vax = X.vaccines.map((v, i) => row(X.vaccines, i, `<input type="text" list="ixvax" data-ixk="name" value="${esc(v.name)}" aria-label="${esc(t("疫苗名称"))}" placeholder="${esc(t("疫苗名称"))}">
    ${sel("dose", optsOf("vax", "dose"), v.dose, "剂次")}${sel("site", optsOf("vax", "site"), v.site, "接种部位")}`)).join("");
  const meds = X.meds.map((m, i) => row(X.meds, i, `${sel("cat", optsOf("bmed", "cat"), m.cat, "类别")}<input type="text" data-ixk="name" value="${esc(m.name)}" aria-label="${esc(t("名称"))}" placeholder="${esc(t("名称"))}">
    <input type="text" data-ixk="dose" value="${esc(m.dose)}" aria-label="${esc(t("剂量（按医嘱/说明书）"))}" placeholder="${esc(t("剂量"))}">`)).join("");
  const ms = X.milestones.map((m, i) => row(X.milestones, i, `${sel("cat", optsOf("milestone", "cat"), m.cat, "类别")}<input type="text" data-ixk="name" value="${esc(m.name)}" aria-label="${esc(t("做到了什么"))}" placeholder="${esc(t("做到了什么"))}">`)).join("");
  const n = count();
  const read = `<div class="panel ix-read"><p class="small muted" style="margin:0 0 8px">${t("拍就诊小结、体检单或疫苗本（可多张），或者打 / 粘贴一段话：量了多少、打了什么针、医生说了什么。AI 读出来后在下面核对，一次保存成几条记录。")}</p>
    ${attachHTML(ATT, { t, esc, textLabel: t("或者打字 / 粘贴"), ph: t("例：体重 9.2 kg，身长 74 cm，打了百白破第3剂、乙肝第3剂（左大腿），医生说发育正常，继续每天维生素 D 400IU，下次 12 个月来") })}
    <div class="btns" style="margin-top:0"><button type="button" class="btn primary" data-ix="read" ${X.busy ? "disabled" : ""}>${X.busy ? t("正在读取…") : `✦ ${t("让 AI 读出来")}`}</button>${X.read ? "" : `<button type="button" class="btn" data-ix="manual">${t("不用 AI，直接填")}</button>`}</div>
    <p class="small muted" style="margin:6px 0 0">${aiReady() ? t("照片只在浏览器里压缩后发给你自己设置的 AI，不保存；不发孩子的名字。读出来的内容请核对。") : t("还没填 API key，去 设置 → AI 助手")}</p></div>`;
  const form = !X.read ? "" : `
    <div class="field"><div class="lab" id="ix_src">${t("记录来源")}</div><div class="seg" role="group" aria-labelledby="ix_src">${["儿科体检", "看病/急诊"].map(o => `<button type="button" data-ix="src" data-v="${o}" aria-pressed="${X.src === o}">${t(o)}</button>`).join("")}</div></div>
    <div class="row2"><div class="field"><label for="ix_ts">${t("时间")}</label><input id="ix_ts" type="datetime-local" data-ixf="ts" max="${nowMax}" value="${toInput(X.ts)}"></div>
      <div class="field"><label for="ix_clinic">${t("医院 / 医生")}</label><input id="ix_clinic" type="text" data-ixf="clinic" value="${esc(X.clinic)}"></div></div>
    <h3 class="ix-h">🌡 ${t("体征")}</h3><div class="ix-vitals">${vit}</div>
    <div class="field"><label for="ix_note">${t("医生的总结 / 建议")}</label><textarea id="ix_note" data-ixf="note" placeholder="${esc(t("医生说了什么、要注意什么、下次什么时候来…"))}">${esc(X.note)}</textarea></div>
    <h3 class="ix-h">💉 ${t("疫苗")} <button type="button" class="chip" data-ix="add-vax">＋ ${t("加一针")}</button></h3><div class="ix-list" data-ixlist="vaccines">${vax || `<p class="small muted">${t("这次没有打针就留空。")}</p>`}</div>
    <h3 class="ix-h">💧 ${t("维生素 / 用药")} <button type="button" class="chip" data-ix="add-med">＋ ${t("加一种")}</button></h3><div class="ix-list" data-ixlist="meds">${meds || `<p class="small muted">${t("医生开了维生素 D、铁剂或药，就加在这里。")}</p>`}</div>
    <h3 class="ix-h">⭐ ${t("里程碑")} <button type="button" class="chip" data-ix="add-ms">＋ ${t("加一个")}</button></h3><div class="ix-list" data-ixlist="milestones">${ms || `<p class="small muted">${t("医生提到会翻身、会走、会说话了，可以顺手记下。")}</p>`}</div>
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
    else X[k] = el.value;
  });
  box.querySelectorAll("[data-ixlist]").forEach(list => {
    const arr = X[list.dataset.ixlist];
    list.querySelectorAll(".ix-row").forEach((r, i) => { const o = arr[i]; if (!o) return;
      o.on = r.querySelector("[data-ixon]").checked;
      r.querySelectorAll("[data-ixk]").forEach(el => { o[el.dataset.ixk] = el.value.trim(); }); });
  });
}
const keepVitals = () => VITALS.some(([k]) => X[k] != null) || X.note.trim() || X.clinic.trim();
const count = () => (keepVitals() ? 1 : 0) + X.vaccines.filter(v => v.on && v.name).length + X.meds.filter(m => m.on && m.name).length + X.milestones.filter(m => m.on && m.name).length;

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
    const r = parseIntake(await askText(INTAKE_SYSTEM, user, { json: true, images, maxTokens: 3000 }));
    if (!r) throw new Error(t("没读出内容，换一张清楚点的照片或多写几句试试"));
    if (!X) return;   // 读的时候表被关了
    readIx();
    if (r.day) { const d = new Date(r.day + "T09:00:00").getTime(); if (d <= Date.now()) X.ts = d; }
    if (r.src) X.src = r.src;
    for (const k of ["weight", "length", "head", "temp"]) if (r[k] != null) X[k] = r[k];
    if (r.clinic) X.clinic = r.clinic;
    const next = r.next ? t("下次：{s}", { s: r.next }) : "";
    if (r.note || next) X.note = [X.note.trim(), r.note, next].filter(Boolean).join("\n");
    X.vaccines.push(...r.vaccines.map(v => ({ on: true, name: v.name, dose: v.dose || "", site: v.site || "" })));
    X.meds.push(...r.meds.map(m => ({ on: true, cat: m.cat, name: m.name, dose: m.dose })));
    X.milestones.push(...r.milestones.map(m => ({ on: true, cat: m.cat, name: m.name })));
    X.read = true;
    toast(t("读出来了，请核对"));
  } catch (e) { toast(t("读取失败：{msg}", { msg: String(e.message || e).slice(0, 100) })); }
  finally { if (X) { X.busy = false; draw(); } }
}

/* ---- 保存：一条宝宝健康 + 每一针 + 每种药 + 每个里程碑，时间相同 ---- */
async function save(){
  readIx();
  if (X.ts > Date.now() + 60000) { toast(t("时间不能晚于现在")); return; }
  const base = { ts: X.ts, child: X.child }, clinic = X.clinic.trim(), rows = [];
  if (keepVitals()) rows.push({ ...base, id: newId(), type: "baby", src: X.src, clinic, ...Object.fromEntries(VITALS.map(([k]) => [k, X[k] ?? null]).filter(([, v]) => v != null)), note: X.note.trim() });
  for (const v of X.vaccines) if (v.on && v.name) rows.push({ ...base, id: newId(), type: "vax", name: v.name, dose: v.dose || undefined, site: v.site || undefined, clinic, reaction: "无" });
  for (const m of X.meds) if (m.on && m.name) rows.push({ ...base, id: newId(), type: "bmed", cat: m.cat || "药物", name: m.name, dose: m.dose, note: t("{src}时医生开的", { src: t(X.src) }) });
  for (const m of X.milestones) if (m.on && m.name) rows.push({ ...base, id: newId(), type: "milestone", cat: m.cat || "认知", name: m.name, note: t("{src}时医生看到的", { src: t(X.src) }) });
  if (!rows.length) return;
  const src = X.src, cid = X.child, ts = X.ts;
  closeSheet(); X = null;
  for (const e of rows) { for (const k of Object.keys(e)) if (e[k] === undefined || e[k] === "") delete e[k]; await putEntry(e); }
  // 和单独记一次体检一样：勾上时间表里对应的那一次
  if (src === "儿科体检") { const c = matchCheckup(ts, cid), done = (S.settings.checkups || {})[cid] || {};
    if (c && !done[c.k]) { S.settings.checkups = { ...S.settings.checkups, [cid]: { ...done, [c.k]: true } }; await saveSettings(); toast(t("已保存 {n} 条，并勾选了 {label} 体检", { n: rows.length, label: t(c.label) })); return; } }
  toast(t("已保存 {n} 条", { n: rows.length }));
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
    case "add-vax": X.vaccines.push({ on: true, name: "", dose: "", site: "" }); break;
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
