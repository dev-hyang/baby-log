import { APP_VERSION, S, child, childOf, isKidType } from "./state.js";
import { familyHTML } from "./sync.js";
import { TYPES, flags } from "./types.js";
import { DISP_DEC, KG_LB, fromDisp, isUS, toDisp, trim, unitOf, unitPref } from "./units.js";
import { $, esc, fromInput, newId, num, toInput } from "./util.js";

/* ============ sheet as a page ============
   The form replaces the page content instead of floating over it, so nothing depends on how a given
   iOS version sizes the viewport around its toolbars. Back gesture / back button closes it. */
let sheetScrollY = 0;
function showSheet(){
  const d = $("#sheet");
  if (!d.open) {
    sheetScrollY = window.scrollY;
    d.show(); // non-modal: rendered in page flow
    document.body.classList.add("sheet-open");
    try { history.pushState({ sheet: 1 }, ""); } catch (e) {}
  }
  window.scrollTo(0, 0);
  const first = d.querySelector(".sheet-head h3"); if (first) { first.tabIndex = -1; first.focus({ preventScroll: true }); }
}
$("#sheet").addEventListener("close", () => {
  document.body.classList.remove("sheet-open");
  requestAnimationFrame(() => window.scrollTo(0, sheetScrollY));
  if (history.state && history.state.sheet) { try { history.back(); } catch (e) {} }
});
window.addEventListener("popstate", () => { const d = $("#sheet"); if (d.open) d.close(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#sheet").open) $("#sheet").close(); });

/* ============ form sheet ============ */
let draft = null;
function openForm(type, existing, preset){
  const T = TYPES[type];
  draft = existing ? { ...existing } : { id: newId(), type, ts: Date.now(), ...(isKidType(type) ? { child: S.childId } : {}), ...preset };
  if (!existing) for (const f of T.fields) if (f.def !== undefined && draft[f.k] === undefined) draft[f.k] = f.def;
  drawForm(); showSheet(false);
}
function drawForm(focusKey){
  const T = TYPES[draft.type], isNew = !S.entries.some(e => e.id === draft.id);
  const fieldsHTML = T.fields.filter(f => !f.show || f.show(draft)).map(f => {
    const v = draft[f.k], id = "f_" + f.k;
    let inner = "";
    if (f.type === "seg") inner = `<div class="lab" id="${id}">${f.label}</div><div class="seg" role="group" aria-labelledby="${id}">${f.opts.map(o => `<button type="button" data-seg="${f.k}" data-v="${esc(o)}" aria-pressed="${v === o}">${esc(o)}</button>`).join("")}</div>`;
    else if (f.type === "check") inner = `<label class="check"><input type="checkbox" data-f="${f.k}" ${v ? "checked" : ""}>${f.label}</label>`;
    else if (f.type === "num" && f.dim === "wbaby" && isUS()) {
      const tot = v == null || v === "" ? null : +v * KG_LB * 16;
      let lb = tot == null ? "" : Math.floor(tot / 16), oz = tot == null ? "" : trim(tot - lb * 16, 1);
      if (oz === "16") { lb++; oz = "0"; }
      inner = `<div class="lab">${f.label}（lb + oz）</div><div class="row2">
        <input id="${id}" aria-label="${f.label} 磅 lb" type="number" inputmode="decimal" step="1" min="0" data-wpart="lb" data-orig="${lb}" value="${lb}" placeholder="lb">
        <input aria-label="${f.label} 盎司 oz" type="number" inputmode="decimal" step="0.1" min="0" max="15.9" data-wpart="oz" data-orig="${oz}" value="${oz}" placeholder="oz"></div>`;
    }
    else if (f.type === "num") {
      const dv = f.dim ? (v == null || v === "" ? "" : trim(toDisp(f.dim, v), DISP_DEC[f.dim])) : (v ?? "");
      inner = `<label for="${id}">${f.label}${f.dim ? `（${unitOf(f.dim)}）` : ""}</label><input id="${id}" type="number" inputmode="decimal" step="${f.dim && isUS() ? "any" : (f.step || 1)}" min="0" data-f="${f.k}" ${f.dim ? `data-dim="${f.dim}" data-orig="${dv}"` : ""} value="${dv}" placeholder="${esc(f.ph || "")}">`;
    }
    else if (f.type === "datetime") inner = `<label for="${id}">${f.label}</label><input id="${id}" type="datetime-local" data-f="${f.k}" data-kind="dt" value="${v ? toInput(v) : ""}">`;
    else if (f.type === "range") inner = `<label for="${id}">${f.label}</label><div class="range"><input id="${id}" type="range" min="${f.min}" max="${f.max}" data-f="${f.k}" value="${v ?? Math.round((f.min + f.max) / 2)}"><output class="num" style="min-width:24px">${v ?? "–"}</output></div>`;
    else if (f.type === "area") inner = `<label for="${id}">${f.label}</label><textarea id="${id}" data-f="${f.k}" placeholder="${esc(f.ph || "")}">${esc(v || "")}</textarea>`;
    else inner = `<label for="${id}">${f.label}</label><input id="${id}" type="text" data-f="${f.k}" value="${esc(v || "")}" ${f.list ? `list="${f.list}"` : ""} placeholder="${esc(f.ph || "")}">`;
    return `<div class="field" ${f.half ? 'data-half="1"' : ""}>${inner}</div>`;
  });
  // pair half-width fields
  const out = []; for (let i = 0; i < fieldsHTML.length; i++) {
    if (fieldsHTML[i].includes('data-half="1"') && fieldsHTML[i + 1]?.includes('data-half="1"')) { out.push(`<div class="row2">${fieldsHTML[i]}${fieldsHTML[i + 1]}</div>`); i++; } else out.push(fieldsHTML[i]);
  }
  const fl = flags(draft);
  $("#sheetIn").innerHTML = `<div class="sheet-head"><h3 id="sheetTitle">${T.icon} ${isNew ? "记录" : "修改"}${T.label}</h3><button class="iconbtn" data-act="close" aria-label="关闭">关闭</button></div>
    ${isKidType(draft.type) && S.settings.children.length > 1 ? `<div class="field"><div class="lab" id="f_child">哪个孩子</div><div class="seg" role="group" aria-labelledby="f_child">${S.settings.children.map(c => `<button type="button" data-seg="child" data-v="${esc(c.id)}" aria-pressed="${childOf(draft) === c.id}">${esc(c.name || "宝宝")}</button>`).join("")}</div></div>` : ""}
    <div class="field"><label for="f_ts">${draft.type === "sleep" ? "入睡时间" : "时间"}</label><input id="f_ts" type="datetime-local" data-f="ts" data-kind="dt" value="${toInput(draft.ts)}"></div>
    ${out.join("")}
    ${fl.map(f => `<div class="warnline" role="alert">${esc(f)}</div>`).join("")}
    <datalist id="vaxlist">${["乙肝疫苗 HepB", "卡介苗 BCG", "脊灰疫苗 IPV/OPV", "百白破 DTaP", "Hib 疫苗", "肺炎球菌疫苗 PCV", "轮状病毒疫苗 RV", "麻腮风 MMR", "水痘疫苗 VAR", "甲肝疫苗 HepA", "乙脑疫苗 JE", "流脑疫苗 MenA/MenAC", "流感疫苗 Flu", "新冠疫苗 COVID-19", "RSV 单抗 nirsevimab"].map(v => `<option value="${v}">`).join("")}</datalist>
    <datalist id="medlist"><option value="布洛芬"><option value="泰诺（对乙酰氨基酚）"><option value="复合维生素"><option value="铁剂"><option value="钙片"></datalist>
    <div class="btns"><button class="btn primary" data-act="save">保存</button>${isNew ? "" : `<button class="btn danger" data-act="del">删除</button>`}</div>`;
  if (focusKey) { const el = $("#sheetIn").querySelector(`[data-seg="${focusKey}"][aria-pressed="true"]`); el && el.focus(); }
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
  $("#sheetIn").innerHTML = `<div class="sheet-head"><h3 id="sheetTitle">补记哪一类？</h3><button class="iconbtn" data-act="close" aria-label="关闭">关闭</button></div>
  <div class="quick">${Object.entries(TYPES).map(([k, t]) => `<button data-add="${k}"><i>${t.icon}</i>${t.label}</button>`).join("")}</div>`;
  showSheet(true);
}

/* ============ settings sheet ============ */
function openSettings(){
  const st = S.settings;
  $("#sheetIn").innerHTML = `<div class="sheet-head"><h3 id="sheetTitle">设置</h3><button class="iconbtn" data-act="close" aria-label="关闭">关闭</button></div>
  <div class="field"><div class="lab">孩子（小名 · 出生日期）</div>
    <div id="kidRows">${st.children.map((c, i) => `<div class="kidrow"><input type="text" aria-label="第${i + 1}个孩子的小名" data-kr="${i}" data-kk="name" value="${esc(c.name)}" placeholder="小名"><input type="date" aria-label="第${i + 1}个孩子的出生日期" data-kr="${i}" data-kk="birth" value="${esc(c.birth)}">${st.children.length > 1 ? `<button class="chip" data-act="delkid" data-i="${i}" aria-label="移除${esc(c.name || "这个孩子")}">移除</button>` : ""}</div>`).join("")}</div>
    <button class="chip" data-act="addkid">＋ 添加孩子</button>
    <p class="small muted" style="margin-top:6px">每个孩子的记录分开保存，点页面顶部的名字可以切换。妈妈的记录属于整个家庭，不随孩子切换。</p></div>
  <div class="field"><div class="lab">妈妈用药的最短间隔（按医嘱或说明书填写）</div>
    <div id="medRules">${(st.medIntervals || []).map((r, i) => `<div class="row2" style="margin-bottom:6px"><input type="text" aria-label="药名" data-mr="${i}" data-mk="name" value="${esc(r.name)}" placeholder="药名"><input type="number" inputmode="decimal" aria-label="间隔小时" data-mr="${i}" data-mk="hours" value="${esc(r.hours)}" placeholder="间隔（小时）"></div>`).join("")}</div>
    <button class="chip" data-act="addrule">＋ 添加一种药</button></div>
  <div class="btns"><button class="btn primary" data-act="savesettings">保存设置</button></div>

  <h2>家庭协作</h2>
  ${familyHTML()}
  <h2>数据</h2>
  <p class="small muted">${S.mode === "family" ? "记录保存在家庭云端，每台设备都有一份离线副本；没网时照常记录，联网后自动同步。" : S.mode === "cloud" ? "记录已同步到你的 Claude 账号，同时在本设备留有副本。" : "记录目前只保存在这台设备的浏览器里。换手机或清理浏览器数据会丢失，建议每周导出一次备份。"}</p>
  <div class="btns"><button class="btn" data-act="export">导出备份（JSON）</button><button class="btn" data-act="csv">导出表格（CSV）</button><button class="btn" data-act="import">从备份恢复</button></div>
  <div class="btns"><button class="btn" data-act="demo">载入演示数据</button><button class="btn" data-act="cleardemo">清除演示数据</button><button class="btn danger" data-act="clearall">清空全部记录</button></div>
  <h2>单位</h2>
  <div class="seg" role="group" aria-label="单位">${[["auto", `自动（当前：${isUS() ? "美制" : "公制"}）`], ["metric", "公制 kg · cm · ml · ℃"], ["us", "美制 lb · in · fl oz · ℉"]].map(([v, l]) => `<button data-units-set="${v}" aria-pressed="${unitPref() === v}">${l}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:6px">只影响这台设备的显示和输入。数据统一按公制保存，切换不会改动已有记录，家人可以各用各的单位。“自动”按手机的语言和时区判断（北美时区默认美制）。</p>
  <p class="small muted" style="margin-top:24px">版本 ${APP_VERSION}</p>
  <h2>显示</h2>
  <div class="seg" role="group" aria-label="外观">${[["", "跟随系统"], ["light", "浅色"], ["dark", "深色（夜里喂奶）"]].map(([v, l]) => `<button data-theme-set="${v}" aria-pressed="${(document.documentElement.dataset.theme || "") === v}">${l}</button>`).join("")}</div>`;
  showSheet(false);
}
function readSettingsInputs(){
  const kids = []; document.querySelectorAll("[data-kr]").forEach(el => { const i = +el.dataset.kr; (kids[i] ||= { ...S.settings.children[i] })[el.dataset.kk] = el.value.trim(); });
  if (kids.length) S.settings.children = kids.filter(c => c && c.id);
  const rules = []; document.querySelectorAll("[data-mr]").forEach(el => { const i = +el.dataset.mr; (rules[i] ||= { name: "", hours: "" })[el.dataset.mk] = el.value.trim(); });
  S.settings.medIntervals = rules.filter(r => r && (r.name || r.hours));
}

export { sheetScrollY, showSheet, draft, openForm, drawForm, readDraftInputs, pickType, openSettings, readSettingsInputs };
