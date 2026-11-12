/* ============ AI 一次录入体检 / 就诊：提示词和整理（纯函数，tests/intake-lib.test.mjs 有单测） ============
   一次体检常常同时有：量的体征（体重、身长、头围、体温）、打的疫苗、医生的总结和建议、开的药 / 维生素、下次什么时候来。
   用户拍就诊小结 / 疫苗本（可多张），或者粘贴 / 打一段话，AI 读成下面的 JSON；这里统一换成公制、
   把疫苗名、剂次、部位、药的类别对到表单里已有的选项（对不上的保留原文），交给 intake.js 列出来核对后一次保存成几条记录。
   这个文件不 import 任何东西：家庭学堂的成长页也用同一份（homeschool/js/intake-lib.js，改了请同步）。 */

const INTAKE_SYSTEM = `You read a child's pediatric visit: photos (after-visit summary, well-child checkup sheet, vaccine record, growth chart, prescription) and/or text a parent typed or pasted (any language).
Return ONLY JSON with this shape (omit what is not there; never invent values):
{"date":"YYYY-MM-DD|null","kind":"checkup|sick|null","clinic":"clinic or doctor name",
"vitals":{"weight_kg":n,"weight_lb":n,"weight_oz":n,"length_cm":n,"length_in":n,"head_cm":n,"head_in":n,"temp_c":n,"temp_f":n},
"summary":"what the doctor found and advised, short and close to the original wording, in the input's language",
"next_visit":"YYYY-MM-DD or a phrase such as 'in 2 months', or null",
"vaccines":[{"name":"vaccine as written, e.g. DTaP, HepB, MMR, 百白破","dose":1|2|3|4|5|"booster"|null,"site":"left thigh|right thigh|left arm|right arm|oral|null"}],
"meds":[{"kind":"vitamin_d|iron|probiotic|medicine","name":"name","dose":"dose and how often as written"}],
"milestones":[{"name":"a developmental milestone the doctor noted the child can do","area":"gross_motor|fine_motor|language|social|cognitive|self_care"}]}
Rules: "kind" is checkup for a well-child / routine visit, sick for an illness, injury or urgent visit. Weight given as "15 lb 4 oz" -> weight_lb 15 and weight_oz 4. Length = height.
List each vaccine given at THIS visit once (combination shots such as Pediarix or Vaxelis: one entry with the product name). Do not list vaccines that are only due later.
Do not include names, dates of birth, addresses, phone numbers, insurance or ID numbers.`;

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

/** 模型返回 → { day, src, clinic, temp, weight, length, head, note, next, vaccines, meds, milestones }（公制：℃、kg、cm）；读不出 JSON 返回 null */
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
  const vaccines = (Array.isArray(o.vaccines) ? o.vaccines : []).filter(x => x && (x.name || typeof x === "string")).slice(0, 12)
    .map(x => (typeof x === "string" ? { name: vaxName(x), dose: null, site: null } : { name: vaxName(x.name), dose: vaxDose(x.dose), site: vaxSite(x.site) })).filter(x => x.name);
  const meds = (Array.isArray(o.meds) ? o.meds : []).filter(x => x && x.name).slice(0, 8).map(x => ({ cat: medCat(x.kind, x.name), name: str(x.name, 80), dose: str(x.dose, 80) }));
  const out = {
    day: isDay(o.date) ? o.date : null,
    src: o.kind === "sick" ? "看病/急诊" : o.kind === "checkup" ? "儿科体检" : null,
    clinic: str(o.clinic, 80),
    weight: r(ok(weight, 0.5, 150), 3), length: r(ok(length, 30, 220), 1), head: r(ok(head, 25, 65), 1), temp: r(ok(temp, 34, 43), 1),
    note: str(o.summary, 2000), next: str(o.next_visit, 60),
    vaccines, meds, milestones: (Array.isArray(o.milestones) ? o.milestones : []).map(x => (typeof x === "string" ? { name: str(x, 80), cat: "认知" } : x && { name: str(x.name, 80), cat: MS_CAT[x.area] || "认知" })).filter(x => x && x.name).slice(0, 8)
  };
  const any = out.weight || out.length || out.head || out.temp || out.note || vaccines.length || meds.length || out.milestones.length;
  return any ? out : null;
}

export { INTAKE_SYSTEM, VAX_NAMES, parseIntake, vaxName, vaxDose, vaxSite, medCat };
