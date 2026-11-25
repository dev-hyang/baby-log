import { aiReady, askText } from "./ai.js";
import { lang, t } from "./i18n.js";
import { REC_AI_SYSTEM, parseRecAi, recAiBody } from "./record-ai.js";
import { LS_KEY, S, ageMonths, birthTs, child, childOf } from "./state.js";
import { putEntry } from "./store.js";
import { closeSheet, head, showSheet } from "./sheet.js";
import { bmiBand, bpLimit, flag, hrRange } from "./vitals.js";
import { $, dayKey, esc, toast } from "./util.js";
import { render } from "./views.js";

/* ============ 体检 / 就诊记录的 AI 解读（11-15，和家庭学堂同一套，提示词和画法在 js/record-ai.js） ============
   成长 → 儿科体检与就诊的每一条下面：「✦ AI 解读」→ 先在弹出的表里看结果 → 保留 / 重新分析 / 不要；
   保留的存在这条记录的 ai 里（家庭学堂也显示、也能重新分析或清除），收在这一条下面，点开看。
   发给 AI 的：年龄、性别、体征和同龄正常范围、医生写的总结 / 建议、同一天的疫苗 / 用药、之前几次的数；不发姓名、医院和医生名字。 */
const OK_KEY = LS_KEY + ".recAiOk";
let busy = null, P = null;   // busy = 正在分析的那条 id；P = 刚分析出来、还没决定保不保留的 { id, ai }

/** 一条体检 / 就诊记录下面的那一小块：没解读过 = 一个按钮；保留过 = 可以展开的解读 */
export function recAiHTML(e){
  const b = busy === e.id;
  if (!e.ai) return `<div class="rec-ai"><button type="button" class="chip rec-ai-btn" data-recai="run" data-id="${esc(e.id)}" ${b ? "disabled" : ""}>${b ? t("分析中…") : `✦ ${t("AI 解读")}`}</button></div>`;
  return `<details class="rec-ai gb-ai"><summary>✦ ${t("AI 解读")} <span class="small muted">${esc(String(e.ai.at || "").slice(0, 10))}</span></summary><div class="gb-ai-in">${recAiBody(e.ai, t, esc)}
    <div class="btns"><button type="button" class="ui-btn" data-tone="ghost" data-recai="run" data-id="${esc(e.id)}" ${b ? "disabled" : ""}>${b ? t("分析中…") : t("重新分析")}</button><button type="button" class="ui-btn" data-tone="ghost" data-recai="clear" data-id="${esc(e.id)}">${t("清除")}</button></div>
    <p class="small muted">${t("AI 不是医生：意见不同时以医生为准，把它当成复诊时要问的问题。")}</p></div></details>`;
}

function ageText(cid, ts){
  const m = ageMonths(cid, ts); if (m == null) return null;
  if (m < 1) { const b = birthTs(cid); return b ? `${Math.max(0, Math.floor((ts - b) / 864e5))} days` : "under 1 month"; }
  return m < 24 ? `${m} months` : `${Math.floor(m / 12)} years ${m % 12} months`;
}
/** 一条记录 → 发给 AI 的输入（不含姓名、医院、医生） */
function inputOf(e){
  const cid = childOf(e), m = ageMonths(cid, e.ts), sx = (child(cid) || {}).sex || null, d = dayKey(e.ts), hr = hrRange(m), bp = bpLimit(m, sx);
  const mine = type => S.entries.filter(x => x.type === type && !x.deleted && childOf(x) === cid);
  const meas = Object.fromEntries(Object.entries({ weight_kg: e.weight, length_cm: e.length, head_cm: e.head, temp_c: e.temp, bmi: e.bmi, bp_systolic: e.bp_sys, bp_diastolic: e.bp_dia, pulse: e.pulse,
    weight_pct: e.wpct, length_pct: e.lpct, head_pct: e.headpct, bmi_pct: e.bmipct }).filter(([, v]) => v != null && v !== ""));
  const flags = ["pulse", "bp_sys", "bp_dia", "bmipct", "wpct", "lpct", "headpct"].map(k => [k, flag(k, e[k], m, sx)]).filter(([, v]) => v).map(([k, v]) => `${k}: ${v === "高" ? "high" : "low"}`);
  return { record: e.src === "儿科体检" ? "well-child checkup" : "sick / urgent visit", date: d, age: ageText(cid, e.ts), sex: { m: "boy", f: "girl" }[sx] || null, measurements: meas,
    normal_ranges: { pulse: hr ? `${hr.lo}-${hr.hi}` : null, bp_screen_limit: bp ? `${bp.sys}/${bp.dia}` : null, bmi_band: e.bmipct != null ? bmiBand(+e.bmipct) : null, percentiles: "P3-P97 is the usual range" }, flags,
    doctor_summary_and_advice: e.note || "",
    vaccines_same_day: mine("vax").filter(v => dayKey(v.ts) === d).map(v => [v.name, v.dose].filter(Boolean).join(" ")),
    medicines_same_day: mine("bmed").filter(v => dayKey(v.ts) === d).map(v => [v.name, v.dose].filter(Boolean).join(" ")),
    earlier: mine("baby").filter(x => x.ts < e.ts - 864e5 && (x.weight || x.length || x.head)).sort((a, b) => b.ts - a.ts).slice(0, 3)
      .map(x => ({ date: dayKey(x.ts), weight_kg: x.weight ?? null, length_cm: x.length ?? null, head_cm: x.head ?? null })) };
}

function drawSheet(working){
  if (!P) return;
  $("#sheetIn").innerHTML = `${head(`✦ ${esc(t("AI 解读"))}`)}<div class="panel gb-ai-in">${recAiBody(P.ai, t, esc)}</div>
    <div class="btns"><button type="button" class="ui-btn" data-tone="primary" data-recai="keep">${t("保留")}</button><button type="button" class="ui-btn" data-tone="ghost" data-recai="run" data-id="${esc(P.id)}" ${working ? "disabled" : ""}>${working ? t("分析中…") : t("重新分析")}</button><button type="button" class="ui-btn" data-tone="ghost" data-recai="drop">${t("不要")}</button></div>
    <p class="small muted">${t("AI 不是医生：意见不同时以医生为准，把它当成复诊时要问的问题。保留后显示在这条记录下面，可以重新分析或清除。")}</p>`;
}
async function run(id){
  const e = S.entries.find(x => x.id === id); if (!e || busy) return;
  if (!aiReady()) { toast(t("还没填 API key，去 设置 → AI 助手")); return; }
  let ok = false; try { ok = localStorage.getItem(OK_KEY) === "1"; } catch (err) { /* 忽略 */ }
  if (!ok) { if (!confirm(t("会把这条记录的体征、医生的总结和建议、同一天的疫苗 / 用药和宝宝的年龄发给你自己设置的 AI 服务商（不发姓名、医院和医生名字）。继续吗？"))) return; try { localStorage.setItem(OK_KEY, "1"); } catch (err) { /* 忽略 */ } }
  busy = id; render(); if (P && $("#sheet").open) drawSheet(true);
  try {
    const ai = parseRecAi(await askText(REC_AI_SYSTEM(lang()), JSON.stringify(inputOf(e)), { json: true, maxTokens: 2200 }));
    if (!ai) throw new Error(t("AI 返回的格式不对，再试一次"));
    P = { id, ai }; drawSheet(false); if (!$("#sheet").open) showSheet("form");
  } catch (err) { toast(t("分析失败：{msg}", { msg: String(err.message || err).slice(0, 100) })); if (P) drawSheet(false); }
  finally { busy = null; render(); }
}

document.addEventListener("click", async ev => {
  const b = ev.target.closest && ev.target.closest("[data-recai]"); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.recai;
  if (a === "run") { await run(b.dataset.id); return; }
  if (a === "drop") { P = null; closeSheet(); return; }
  if (a === "keep") {
    const e = P && S.entries.find(x => x.id === P.id); if (!e) { P = null; closeSheet(); return; }
    await putEntry({ ...e, ai: P.ai }); P = null; closeSheet(); toast(t("已保留")); render(); return;
  }
  if (a === "clear") {
    const e = S.entries.find(x => x.id === b.dataset.id); if (!e || !confirm(t("清除这条 AI 解读？"))) return;
    const { ai, ...rest } = e; await putEntry(rest); toast(t("已清除")); render();
  }
}, true);
