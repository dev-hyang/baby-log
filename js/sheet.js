import { t } from "./i18n.js";
import { S, childName, childOf, isKidType } from "./state.js";
import { milestoneNames, stageTypes } from "./stages.js";
import { TYPES, flags, typeLabel } from "./types.js";
import { DISP_DEC, KG_LB, fromDisp, isUS, toDisp, trim, unitOf } from "./units.js";
import { $, esc, fromInput, newId, num, toInput } from "./util.js";

/* ============ sheet as a page ============
   The record form replaces the page content instead of floating over it, so nothing depends on how a given
   iOS version sizes the viewport around its toolbars. Back gesture / back button closes it. */
let sheetScrollY = 0, sheetKind = null; // "form" | "pick"
// the page manages its own scroll position when the sheet's history entry is popped
try { history.scrollRestoration = "manual"; } catch (e) {}
function showSheet(kind){
  const d = $("#sheet");
  sheetKind = kind;
  if (!d.open) {
    sheetScrollY = window.scrollY;
    d.show(); // non-modal: rendered in page flow
    document.body.classList.add("sheet-open");
    try { history.pushState({ sheet: 1 }, ""); } catch (e) {}
  }
  window.scrollTo(0, 0);
  const first = d.querySelector(".sheet-head h3"); if (first) { first.tabIndex = -1; first.focus({ preventScroll: true }); }
}
// Runs once per close, whether we closed the sheet ourselves or the browser did (back gesture); returns to
// where the form was opened.
function onSheetClosed(){
  if (sheetKind == null) return;
  sheetKind = null;
  document.body.classList.remove("sheet-open");
  window.scrollTo(0, sheetScrollY); requestAnimationFrame(() => window.scrollTo(0, sheetScrollY));
  if (history.state && history.state.sheet) { try { history.back(); } catch (e) {} }
}
function closeSheet(){ const d = $("#sheet"); if (d.open) d.close(); onSheetClosed(); }
$("#sheet").addEventListener("close", onSheetClosed);
window.addEventListener("popstate", () => { if ($("#sheet").open) closeSheet(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#sheet").open) closeSheet(); });

const head = title => `<div class="sheet-head"><h3 id="sheetTitle">${title}</h3><button class="iconbtn" data-act="close" aria-label="${t("关闭")}">${t("关闭")}</button></div>`;
// suggestion lists for free-text fields, shown in the interface language
const VAX_LIST = ["乙肝疫苗 HepB", "卡介苗 BCG", "脊灰疫苗 IPV/OPV", "百白破 DTaP", "Hib 疫苗", "肺炎球菌疫苗 PCV", "轮状病毒疫苗 RV", "麻腮风 MMR", "水痘疫苗 VAR", "甲肝疫苗 HepA", "乙脑疫苗 JE", "流脑疫苗 MenA/MenAC", "流感疫苗 Flu", "新冠疫苗 COVID-19", "RSV 单抗 nirsevimab"];
const MED_LIST = ["布洛芬", "泰诺（对乙酰氨基酚）", "复合维生素", "铁剂", "钙片"];
const FOOD_LIST = ["高铁米粉", "南瓜泥", "红薯泥", "胡萝卜泥", "土豆泥", "苹果泥", "香蕉", "牛油果", "蛋黄", "鸡蛋", "豆腐", "鱼肉", "鸡肉", "牛肉", "猪肝", "酸奶", "粥", "面条", "花生酱（稀）", "西兰花", "菠菜", "草莓", "橙子"];
const datalist = (id, items) => `<datalist id="${id}">${items.map(v => `<option value="${esc(v)}">`).join("")}</datalist>`;

/* ============ form sheet ============ */
let draft = null;
function openForm(type, existing, preset){
  const T = TYPES[type];
  draft = existing ? { ...existing } : { id: newId(), type, ts: Date.now(), ...(isKidType(type) ? { child: S.childId } : {}), ...preset };
  if (!existing) for (const f of T.fields) { const d = typeof f.def === "function" ? f.def(draft) : f.def; if (d !== undefined && draft[f.k] === undefined) draft[f.k] = d; }
  drawForm(); showSheet("form");
}
function drawForm(focusKey){
  const T = TYPES[draft.type], isNew = !S.entries.some(e => e.id === draft.id);
  const fieldsHTML = T.fields.filter(f => !f.show || f.show(draft)).map(f => {
    const v = draft[f.k], id = "f_" + f.k, label = t(f.label), ph = esc(f.ph ? t(f.ph) : "");
    let inner = "";
    if (f.type === "seg") {
      let opts = typeof f.opts === "function" ? f.opts(draft) : f.opts;
      if (v && !opts.includes(v)) opts = [...opts, v]; // an older record whose option no longer fits the age list stays visible
      inner = `<div class="lab" id="${id}">${label}</div><div class="seg" role="group" aria-labelledby="${id}">${opts.map(o => `<button type="button" data-seg="${f.k}" data-v="${esc(o)}" aria-pressed="${v === o}">${esc(t(o))}</button>`).join("")}</div>`;
    }
    else if (f.type === "check") inner = `<label class="check"><input type="checkbox" data-f="${f.k}" ${v ? "checked" : ""}>${label}</label>`;
    else if (f.type === "num" && f.dim === "wbaby" && isUS()) {
      const tot = v == null || v === "" ? null : +v * KG_LB * 16;
      let lb = tot == null ? "" : Math.floor(tot / 16), oz = tot == null ? "" : trim(tot - lb * 16, 1);
      if (oz === "16") { lb++; oz = "0"; }
      inner = `<div class="lab">${t("{label}（{u}）", { label, u: "lb + oz" })}</div><div class="row2">
        <input id="${id}" aria-label="${label} ${t("磅 lb")}" type="number" inputmode="decimal" step="1" min="0" data-wpart="lb" data-orig="${lb}" value="${lb}" placeholder="lb">
        <input aria-label="${label} ${t("盎司 oz")}" type="number" inputmode="decimal" step="0.1" min="0" max="15.9" data-wpart="oz" data-orig="${oz}" value="${oz}" placeholder="oz"></div>`;
    }
    else if (f.type === "num") {
      const dv = f.dim ? (v == null || v === "" ? "" : trim(toDisp(f.dim, v), DISP_DEC[f.dim])) : (v ?? "");
      inner = `<label for="${id}">${f.dim ? t("{label}（{u}）", { label, u: unitOf(f.dim) }) : label}</label><input id="${id}" type="number" inputmode="decimal" step="${f.dim && isUS() ? "any" : (f.step || 1)}" min="0" data-f="${f.k}" ${f.dim ? `data-dim="${f.dim}" data-orig="${dv}"` : ""} value="${dv}" placeholder="${ph}">`;
    }
    else if (f.type === "datetime") inner = `<label for="${id}">${label}</label><input id="${id}" type="datetime-local" data-f="${f.k}" data-kind="dt" value="${v ? toInput(v) : ""}">`;
    else if (f.type === "range") inner = `<label for="${id}">${label}</label><div class="range"><input id="${id}" type="range" min="${f.min}" max="${f.max}" data-f="${f.k}" value="${v ?? Math.round((f.min + f.max) / 2)}"><output class="num" style="min-width:24px">${v ?? "–"}</output></div>`;
    else if (f.type === "area") inner = `<label for="${id}">${label}</label><textarea id="${id}" data-f="${f.k}" placeholder="${ph}">${esc(v || "")}</textarea>`;
    else inner = `<label for="${id}">${label}</label><input id="${id}" type="text" data-f="${f.k}" value="${esc(v || "")}" ${f.list ? `list="${f.list}"` : ""} placeholder="${ph}">`;
    const hint = typeof f.hint === "function" ? f.hint(draft) : f.hint;
    return `<div class="field" ${f.half ? 'data-half="1"' : ""}>${inner}${hint ? `<p class="small muted" style="margin:6px 0 0">${esc(hint)}</p>` : ""}</div>`;
  });
  // pair half-width fields
  const out = []; for (let i = 0; i < fieldsHTML.length; i++) {
    if (fieldsHTML[i].includes('data-half="1"') && fieldsHTML[i + 1]?.includes('data-half="1"')) { out.push(`<div class="row2">${fieldsHTML[i]}${fieldsHTML[i + 1]}</div>`); i++; } else out.push(fieldsHTML[i]);
  }
  const fl = flags(draft);
  $("#sheetIn").innerHTML = `${head(`${T.icon} ${t(isNew ? "记录{type}" : "修改{type}", { type: typeLabel(draft.type) })}`)}
    ${whoHTML(isNew)}
    <div class="field"><label for="f_ts">${draft.type === "sleep" ? t("入睡时间") : t("时间")}</label><input id="f_ts" type="datetime-local" data-f="ts" data-kind="dt" value="${toInput(draft.ts)}"></div>
    ${out.join("")}
    ${fl.map(f => `<div class="warnline" role="alert">${esc(f)}</div>`).join("")}
    ${datalist("vaxlist", VAX_LIST.map(v => t(v)))}${datalist("medlist", MED_LIST.map(v => t(v)))}${datalist("foodlist", FOOD_LIST.map(v => t(v)))}${datalist("milestonelist", milestoneNames())}
    <div class="btns"><button class="btn primary" data-act="save">${t("保存")}</button>${isNew ? "" : `<button class="btn danger" data-act="del">${t("删除")}</button>`}</div>`;
  if (focusKey) { const el = $("#sheetIn").querySelector(`[data-seg="${focusKey}"][aria-pressed="true"]`); el && el.focus(); }
}
/* Which child the record belongs to. The form opens for the child shown on the page, so by default this is
   one quiet line; "换一个孩子" expands the choice. A new activity can be shared by several children (reading
   to both), so it offers multi-select and saves one entry per child. */
function whoHTML(isNew){
  const kids = S.settings.children;
  if (!isKidType(draft.type) || kids.length < 2) return "";
  const cur = childOf(draft);
  if (["activity", "companion"].includes(draft.type) && isNew) {
    const sel = new Set([cur, ...(draft.also || [])]);
    return `<div class="field"><div class="lab" id="f_child">${t("哪个孩子（可多选，一起做的活动会各记一条）")}</div><div class="seg" role="group" aria-labelledby="f_child">${kids.map(c => `<button type="button" data-who="${esc(c.id)}" aria-pressed="${sel.has(c.id)}">${esc(c.name || t("宝宝"))}</button>`).join("")}</div></div>`;
  }
  if (draft._pick) return `<div class="field"><div class="lab" id="f_child">${t("记录给哪个孩子")}</div><div class="seg" role="group" aria-labelledby="f_child">${kids.map(c => `<button type="button" data-seg="child" data-v="${esc(c.id)}" aria-pressed="${cur === c.id}">${esc(c.name || t("宝宝"))}</button>`).join("")}</div></div>`;
  return `<div class="field who"><span class="small muted">${t("记录给")}</span><b>${esc(childName(cur))}</b><button type="button" class="chip" data-act="who-change">${t("换一个孩子")}</button></div>`;
}
function readDraftInputs(){
  $("#sheetIn").querySelectorAll("[data-f]").forEach(el => {
    const k = el.dataset.f;
    if (el.type === "checkbox") draft[k] = el.checked;
    else if (el.dataset.kind === "dt") draft[k] = fromInput(el.value);
    else if (el.dataset.dim) { if (el.value !== el.dataset.orig) draft[k] = fromDisp(el.dataset.dim, el.value); } // untouched → keep exact stored value
    else if (el.type === "number" || el.type === "range") draft[k] = num(el.value);
    else draft[k] = el.value.trim();
  });
  const lbEl = $("#sheetIn [data-wpart=lb]"), ozEl = $("#sheetIn [data-wpart=oz]");
  if (lbEl && (lbEl.value !== lbEl.dataset.orig || ozEl.value !== ozEl.dataset.orig)) {
    const lb = num(lbEl.value) || 0, oz = num(ozEl.value) || 0;
    draft.weight = (lbEl.value === "" && ozEl.value === "") ? null : +((lb + oz / 16) / KG_LB).toFixed(4);
  }
  if (!draft.ts) draft.ts = Date.now();
}
function pickType(){
  draft = null;
  const first = stageTypes(), rest = Object.keys(TYPES).filter(k => !first.includes(k));
  const grid = keys => `<div class="quick">${keys.map(k => `<button data-add="${k}"><i>${TYPES[k].icon}</i>${typeLabel(k)}</button>`).join("")}</div>`;
  $("#sheetIn").innerHTML = `${head(t("补记哪一类？"))}
  ${grid(first)}
  ${rest.length ? `<h2>${t("其他")}</h2>${grid(rest)}` : ""}`;
  showSheet("pick");
}

export { sheetScrollY, showSheet, closeSheet, head, draft, openForm, drawForm, readDraftInputs, pickType };
