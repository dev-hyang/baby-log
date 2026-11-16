/* ============ AI 一次录入体检 / 就诊：提示词和整理（纯函数，tests/intake-lib.test.mjs 有单测） ============
   一次体检常常同时有：量的体征（体重、身长、头围、体温）、打的疫苗、医生的总结和建议、开的药 / 维生素、下次什么时候来。
   用户拍就诊小结 / 疫苗本（可多张），或者粘贴 / 打一段话，AI 读成下面的 JSON；这里统一换成公制、
   把疫苗名、剂次、部位、药的类别对到表单里已有的选项（对不上的保留原文），交给 intake.js 列出来核对后一次保存成几条记录。
   这个文件不 import 任何东西：家庭学堂的成长页也用同一份（homeschool/js/intake-lib.js，改了请同步）。 */

const INTAKE_SYSTEM = `You read a child's pediatric visit: photos (after-visit summary, well-child checkup sheet, vaccine record, growth chart, prescription) and/or text a parent typed or pasted (any language).
Return ONLY JSON with this shape (omit what is not there; never invent values):
{"date":"YYYY-MM-DD|null","kind":"checkup|sick|null","clinic":"hospital / clinic name only","doctor":"the doctor's or provider's name only, e.g. Dr. Lee",
"vitals":{"weight_kg":n,"weight_lb":n,"weight_oz":n,"length_cm":n,"length_in":n,"head_cm":n,"head_in":n,"temp_c":n,"temp_f":n,
 "bmi":n,"bp_systolic":n,"bp_diastolic":n,"pulse":n,
 "weight_pct":n,"length_pct":n,"head_pct":n,"bmi_pct":n},
"summary":"what the doctor found and advised, short and close to the original wording, in the input's language",
"next_visit":"YYYY-MM-DD or a phrase such as 'in 2 months', or null",
"vaccines":[{"name":"vaccine as written, e.g. DTaP, HepB, MMR, 百白破","date":"YYYY-MM-DD the dose was given, or null","dose":1|2|3|4|5|"booster"|null,"site":"left thigh|right thigh|left arm|right arm|oral|null"}],
"meds":[{"kind":"vitamin_d|iron|probiotic|medicine","name":"name","dose":"dose and how often as written"}],
"milestones":[{"name":"a developmental milestone the doctor noted the child can do","area":"gross_motor|fine_motor|language|social|cognitive|self_care"}]}
Rules: "kind" is checkup for a well-child / routine visit, sick for an illness, injury or urgent visit. Weight given as "15 lb 4 oz" -> weight_lb 15 and weight_oz 4. Length = height.
Blood pressure "98/60" -> bp_systolic 98, bp_diastolic 60; pulse = heart rate per minute. *_pct are the age percentiles printed next to a measurement ("75th", "P75", "75%", "75 百分位") -> 75; "<1st" -> 1, ">99th" -> 99. Only copy a percentile or BMI that is written; never compute one.
Visit summary: list each vaccine given at THIS visit once, with that visit's date (combination shots such as Pediarix or Vaxelis: one entry with the product name).
Vaccine record / immunization history / 接种本 (usually a table, often one row per vaccine with a date for each dose across the columns): list EVERY dose that has a date, one entry per date, with its own "date" and its dose number (column 1 = dose 1 unless labeled otherwise); for such a record leave the top-level "date" null unless it is clearly one visit.
Read dates carefully (MM/DD/YY in US records, YYYY.MM.DD or YYYY年M月D日 in Chinese ones). Do not list vaccines that are only due later or have no date given.
Put the place in "clinic" and the person in "doctor"; never both in one field. Do not include the child's or family's names, dates of birth, addresses, phone numbers, insurance or ID numbers.`;

const num = v => { const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v; return typeof n === "number" && isFinite(n) && n > 0 ? n : null; };
const r = (x, d) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
const str = (v, n = 300) => (v == null ? "" : String(v).trim().slice(0, n));
const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

/* 疫苗：按常见缩写 / 中文名对到小月亮的疫苗列表（sheet.js VAX_LIST 的简体原文）；对不上的保留原文 */
const VAX = [
  [/rsv|nirsevimab|beyfortus|enflonsia|clesrovimab/i, "RSV 单抗 nirsevimab"],
  [/mmr|麻腮风|麻疹/i, "麻腮风 MMR"],
  [/dtap|dtp|百白破|pediarix|vaxelis|pentacel|kinrix|quadracel|infanrix/i, "百白破 DTaP"],
  [/hep\s*-?\s*b|hbv|乙肝/i, "乙肝疫苗 HepB"],
  [/hep\s*-?\s*a|hav|甲肝/i, "甲肝疫苗 HepA"],
  [/bcg|卡介/i, "卡介苗 BCG"],
  [/ipv|opv|polio|脊灰/i, "脊灰疫苗 IPV/OPV"],
  [/hib|流感嗜血/i, "Hib 疫苗"],
  [/pcv|pneumo|prevnar|vaxneuvance|肺炎/i, "肺炎球菌疫苗 PCV"],
  [/rota|\brv\b|轮状/i, "轮状病毒疫苗 RV"],
  [/varicella|\bvar\b|chickenpox|水痘/i, "水痘疫苗 VAR"],
  [/\bje\b|japanese enceph|乙脑/i, "乙脑疫苗 JE"],
  [/mening|menacwy|menb|流脑/i, "流脑疫苗 MenA/MenAC"],
  [/\bflu\b|influenza|fluzone|flulaval|fluarix|flumist|流感/i, "流感疫苗 Flu"],
  [/covid|新冠/i, "新冠疫苗 COVID-19"]
];
/** 组合疫苗（Pediarix、Vaxelis…）对到百白破，但原名保留在括号里，免得丢了「还含乙肝 / 脊灰」的信息 */
function vaxName(raw){
  const s = str(raw, 80); if (!s) return "";
  const bare = x => x.toLowerCase().replace(/[\s\-_/]/g, "");
  for (const [re, name] of VAX) if (re.test(s)) return bare(name).includes(bare(s)) ? name : `${name}（${s}）`;
  return s;
}
const DOSES = ["第1剂", "第2剂", "第3剂", "第4剂", "第5剂"];
function vaxDose(d){
  if (d == null || d === "") return null;
  if (/boost|加强/i.test(String(d))) return "加强";
  const n = parseInt(d, 10); return n >= 1 && n <= 5 ? DOSES[n - 1] : null;
}
function vaxSite(s){
  const x = String(s || "").toLowerCase();
  if (/oral|口服|mouth/.test(x)) return "口服";
  const left = /left|\bl\b|左/.test(x), right = /right|\br\b|右/.test(x), thigh = /thigh|leg|腿|vastus/.test(x), arm = /arm|deltoid|臂/.test(x);
  if ((left || right) && (thigh || arm)) return (left ? "左" : "右") + (thigh ? "大腿" : "上臂");
  return null;
}
const MS_CAT = { gross_motor: "大运动", fine_motor: "精细动作", language: "语言", social: "社交情绪", cognitive: "认知", self_care: "自理" };
const VAX_NAMES = VAX.map(x => x[1]);
const MED_CAT = { vitamin_d: "维生素D", iron: "铁剂", probiotic: "益生菌", medicine: "药物" };
function medCat(kind, name){
  if (MED_CAT[kind]) return MED_CAT[kind];
  const s = `${kind || ""} ${name || ""}`;
  return /vitamin\s*d|维生素\s*d|d-?vi-?sol/i.test(s) ? "维生素D" : /iron|ferrous|铁/i.test(s) ? "铁剂" : /probiotic|益生菌/i.test(s) ? "益生菌" : "药物";
}

/* 两岁以后体检单上常有的：BMI、血压、心率，和体重 / 身高 / 头围 / BMI 的同龄百分位（都没有单位换算）。
   [存的字段, 模型 JSON 里的名字, 合理下限, 上限, 小数位, 表单上的名字] —— 存在「宝宝健康」记录里，小月亮和家庭学堂都显示 */
const EXTRA = [
  ["bmi", "bmi", 8, 60, 1, "BMI"],
  ["bp_sys", "bp_systolic", 50, 200, 0, "血压·高压（mmHg）"],
  ["bp_dia", "bp_diastolic", 20, 140, 0, "血压·低压（mmHg）"],
  ["pulse", "pulse", 30, 250, 0, "心率（次/分）"],
  ["wpct", "weight_pct", 0.1, 100, 1, "体重百分位（%）"],
  ["lpct", "length_pct", 0.1, 100, 1, "身高百分位（%）"],
  ["headpct", "head_pct", 0.1, 100, 1, "头围百分位（%）"],
  ["bmipct", "bmi_pct", 0.1, 100, 1, "BMI 百分位（%）"]
];
const EXTRA_KEYS = EXTRA.map(x => x[0]);
/** 一条记录上的这些数，排成几小段给列表用：[["BMI", "16.2"], ["血压", "98/60"], ["体重", "P75"]…]；名字是简体原文，调用方自己翻译 */
/** 在哪儿看的：医院 / 诊所 · 医生（旧记录只有 clinic 一栏，里面可能两样都写了，照原样显示） */
const placeText = e => [e && e.clinic, e && e.doctor].map(x => String(x || "").trim()).filter(Boolean).join(" · ");
function extraParts(e){
  const p = [], has = k => e && e[k] != null && e[k] !== "";
  if (has("bmi")) p.push(["BMI", String(e.bmi) + (has("bmipct") ? ` (P${e.bmipct})` : "")]);
  if (has("bp_sys") || has("bp_dia")) p.push(["血压", `${has("bp_sys") ? e.bp_sys : "–"}/${has("bp_dia") ? e.bp_dia : "–"}`]);
  if (has("pulse")) p.push(["心率", String(e.pulse)]);
  for (const [k, l] of [["wpct", "体重"], ["lpct", "身高"], ["headpct", "头围"]]) if (has(k)) p.push([l, `P${e[k]}`]);
  if (!has("bmi") && has("bmipct")) p.push(["BMI", `P${e.bmipct}`]);
  return p;
}

/** 模型返回 → { day, src, clinic, doctor, temp, weight, length, head, note, next, vaccines, meds, milestones }（公制：℃、kg、cm）；读不出 JSON 返回 null */
function parseIntake(text){
  let o; try { o = JSON.parse(String(text).replace(/^\s*```(json)?|```\s*$/g, "").trim()); } catch (e) { return null; }
  if (!o || typeof o !== "object") return null;
  const v = o.vitals && typeof o.vitals === "object" ? o.vitals : {};
  const lb = num(v.weight_lb), oz = num(v.weight_oz) || 0;
  const weight = num(v.weight_kg) ?? (lb != null || oz ? (lb || 0) / 2.2046226 + oz / 35.27396 : null);
  const length = num(v.length_cm) ?? (num(v.length_in) != null ? num(v.length_in) * 2.54 : null);
  const head = num(v.head_cm) ?? (num(v.head_in) != null ? num(v.head_in) * 2.54 : null);
  const temp = num(v.temp_c) ?? (num(v.temp_f) != null ? (num(v.temp_f) - 32) * 5 / 9 : null);
  const ok = (x, lo, hi) => (x != null && x >= lo && x <= hi ? x : null);   // 读错一位小数（比如 155 kg）就丢掉，让人自己填
  // 疫苗本一张表可能有几十针（每行一种疫苗、每格一剂），所以上限放宽到 60；每针带自己的日期
  const vaccines = (Array.isArray(o.vaccines) ? o.vaccines : []).filter(x => x && (x.name || typeof x === "string")).slice(0, 60)
    .map(x => (typeof x === "string" ? { name: vaxName(x), day: null, dose: null, site: null } : { name: vaxName(x.name), day: isDay(x.date) ? x.date : null, dose: vaxDose(x.dose), site: vaxSite(x.site) })).filter(x => x.name);
  const meds = (Array.isArray(o.meds) ? o.meds : []).filter(x => x && x.name).slice(0, 8).map(x => ({ cat: medCat(x.kind, x.name), name: str(x.name, 80), dose: str(x.dose, 80) }));
  const out = {
    day: isDay(o.date) ? o.date : null,
    src: o.kind === "sick" ? "看病/急诊" : o.kind === "checkup" ? "儿科体检" : null,
    clinic: str(o.clinic, 80), doctor: str(o.doctor, 60),
    weight: r(ok(weight, 0.5, 150), 3), length: r(ok(length, 30, 220), 1), head: r(ok(head, 25, 65), 1), temp: r(ok(temp, 34, 43), 1),
    ...Object.fromEntries(EXTRA.map(([k, src, lo, hi, d]) => [k, r(ok(num(v[src]), lo, hi), d)])),
    note: str(o.summary, 2000), next: str(o.next_visit, 60),
    vaccines, meds, milestones: (Array.isArray(o.milestones) ? o.milestones : []).map(x => (typeof x === "string" ? { name: str(x, 80), cat: "认知" } : x && { name: str(x.name, 80), cat: MS_CAT[x.area] || "认知" })).filter(x => x && x.name).slice(0, 8)
  };
  const any = out.weight || out.length || out.head || out.temp || EXTRA.some(([k]) => out[k] != null) || out.note || vaccines.length || meds.length || out.milestones.length;
  return any ? out : null;
}

/* ---- 再扫一次同一张单子：找到已经记过的那一条，更新它，不多记一条 ---- */
const nameKey = s => String(s || "").replace(/（.*?）|\(.*?\)/g, "").toLowerCase().replace(/\s+/g, "");
const localDay = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
/** 已有记录里的「同一条」：名字（去掉空格 / 括号里的原名后）一样；给了 day 还要同一天。had = [{ name, ts, … }] */
function sameEntry(had, name, day){
  if (!nameKey(name)) return null;
  return (had || []).find(e => e && (!day || localDay(e.ts) === day) && nameKey(e.name) === nameKey(name)) || null;
}
/** 这一针是不是已经记过（同一天同一种） */
const vaxSeen = (had, name, day) => !!day && !!sameEntry(had, name, day);
/** 同一天已经有的一条就诊「宝宝健康」（体检 / 看病，不管当时选的是哪个）：had = 这个孩子的 baby 记录 */
const sameVisit = (had, day) => (had || []).find(e => e && e.src && e.src !== "自己记录" && localDay(e.ts) === day) || null;
/** 合并：新读到的非空值盖掉旧的，新的没有的保留旧的（以前没扫出来的 BMI、血压就这样补上） */
function mergeInto(old, add){
  const o = { ...old };
  for (const [k, v] of Object.entries(add || {})) {
    if (v == null || v === "") continue;
    const was = String(old && old.note || "").trim(), now = String(v).trim();
    // 医生的总结：同一段话不重复写；原来自己补过的话也不丢
    o[k] = k !== "note" || !was || now.includes(was) ? v : was.includes(now) ? was : `${was}\n${now}`;
  }
  return o;
}

export { INTAKE_SYSTEM, VAX_NAMES, EXTRA, EXTRA_KEYS, extraParts, placeText, parseIntake, vaxName, vaxDose, vaxSite, vaxSeen, sameEntry, sameVisit, mergeInto, localDay, medCat };
