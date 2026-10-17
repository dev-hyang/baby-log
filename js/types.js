import { t } from "./i18n.js";
import { S, ageMonths, babyAgeDays, childOf } from "./state.js";
import { fmtU } from "./units.js";
import { $, D, dur, hm, num } from "./util.js";

/* ============ record types ============
   Labels, placeholders and option values below are the canonical simplified-Chinese strings; the form and
   the summaries translate them for display with t(). Option values are what gets stored, so every device
   in a family keeps the same data no matter which language it shows. */
// Milk options follow the child's age at the time of the record: breast/formula under 1, whole milk
// from 1 (AAP), lower-fat choices from 2. The default remembers the family's last choice for that child.
const MILK_BABY = ["亲喂", "母乳瓶喂", "配方奶", "混合", "吸奶"];
const MILK_1Y = ["全脂牛奶", "亲喂", "配方奶/幼儿奶", "母乳瓶喂", "其他"];
const MILK_2Y = ["全脂牛奶", "2% 低脂", "1% 低脂", "脱脂", "豆奶/植物奶", "亲喂", "其他"];
function milkOpts(m){ const mo = ageMonths(childOf(m), m.ts || Date.now()); return mo == null || mo < 12 ? MILK_BABY : mo < 24 ? MILK_1Y : MILK_2Y; }
function milkDef(m){ const opts = milkOpts(m); const prev = S.entries.filter(e => e.type === "feed" && childOf(e) === childOf(m)).sort((a, b) => b.ts - a.ts)[0]; return prev && opts.includes(prev.method) ? prev.method : opts[0]; }
function milkHint(m){ const mo = ageMonths(childOf(m), m.ts || Date.now()); if (mo == null || mo < 12) return ""; return mo < 24 ? t("AAP：1–2 岁建议全脂牛奶，每天约 2–3 杯（480–720 ml）以内，喝太多会影响吃饭和铁的吸收。") : t("2 岁后可按医生建议换低脂或脱脂奶，每天约 2–2.5 杯（480–600 ml）。"); }
const TYPES = {
  feed:  { label: "喂奶", icon: "🍼", color: "var(--honey)", fields: [
    { k: "method", label: "方式", type: "seg", opts: milkOpts, def: milkDef, hint: milkHint },
    { k: "left", label: "左侧时长（分钟）", type: "num", show: m => ["亲喂", "混合"].includes(m.method), half: 1 },
    { k: "right", label: "右侧时长（分钟）", type: "num", show: m => ["亲喂", "混合"].includes(m.method), half: 1 },
    { k: "ml", label: "奶量", type: "num", dim: "vol", show: m => m.method !== "亲喂" },
    { k: "note", label: "备注", type: "text", ph: "吐奶、拒奶、含乳情况…" } ] },
  diaper:{ label: "尿布", icon: "🧷", color: "var(--sky)", fields: [
    { k: "pee", label: "尿", type: "check", def: true },
    { k: "poop", label: "便", type: "check" },
    { k: "color", label: "大便颜色", type: "seg", opts: ["黄", "绿", "褐", "黑（胎便）", "白/灰白", "带血"], show: m => m.poop },
    { k: "note", label: "备注", type: "text", ph: "性状：稀、糊状、有奶瓣…" } ] },
  sleep: { label: "睡眠", icon: "🌙", color: "var(--slate)", fields: [
    { k: "end", label: "醒来时间（还在睡就留空）", type: "datetime" },
    { k: "where", label: "在哪儿睡", type: "seg", opts: ["婴儿床", "怀里", "推车/安全座椅", "大床"] },
    { k: "how", label: "怎么入睡", type: "seg", opts: ["自主入睡", "奶睡", "抱睡", "拍睡/摇睡"] },
    { k: "note", label: "备注", type: "text", ph: "夜醒次数、哭闹…" } ] },
  baby:  { label: "宝宝健康", icon: "🌡", color: "var(--rose)", fields: [
    { k: "src", label: "记录来源", type: "seg", opts: ["自己记录", "儿科体检", "看病/急诊"], def: "自己记录" },
    { k: "clinic", label: "医院 / 医生", type: "text", show: m => isVisit(m) },
    { k: "temp", label: "体温", type: "num", dim: "temp", step: .1 },
    { k: "weight", label: "体重", type: "num", dim: "wbaby", step: .01 },
    { k: "length", label: "身长", type: "num", dim: "len", step: .1, half: 1 },
    { k: "head", label: "头围", type: "num", dim: "len", step: .1, half: 1 },
    { k: "note", label: "症状 / 看诊记录", type: "area", ph: "黄疸、皮疹、咳嗽、医生说了什么…" } ] },
  bmed:  { label: "宝宝用药", icon: "💧", color: "var(--sage)", fields: [
    { k: "cat", label: "类别", type: "seg", opts: ["维生素D", "铁剂", "益生菌", "药物"], def: "维生素D" },
    { k: "name", label: "名称", type: "text" },
    { k: "dose", label: "剂量（按医嘱/说明书）", type: "text" },
    { k: "note", label: "备注", type: "text" } ] },
  vax:   { label: "疫苗接种", icon: "💉", color: "#3F8F8B", fields: [
    { k: "name", label: "疫苗名称", type: "text", list: "vaxlist", ph: "如 乙肝疫苗 HepB" },
    { k: "dose", label: "剂次", type: "seg", opts: ["第1剂", "第2剂", "第3剂", "第4剂", "第5剂", "加强"] },
    { k: "site", label: "接种部位", type: "seg", opts: ["左大腿", "右大腿", "左上臂", "右上臂", "口服"] },
    { k: "clinic", label: "接种机构 / 医生", type: "text", half: 1 },
    { k: "lot", label: "批号（选填）", type: "text", half: 1 },
    { k: "reaction", label: "接种后反应", type: "seg", opts: ["无", "局部红肿", "发热", "哭闹", "其他"] },
    { k: "note", label: "备注", type: "area", ph: "下次接种日期、医生交代的注意事项…" } ] },
  /* ---- 婴儿期起 ---- */
  food:  { label: "饮食", icon: "🥣", color: "#C8743A", fields: [
    { k: "meal", label: "哪一餐", type: "seg", opts: ["辅食", "早餐", "午餐", "晚餐", "加餐", "奶"], def: "辅食" },
    { k: "foods", label: "吃了什么", type: "text", list: "foodlist", ph: "米糊、南瓜泥、鸡蛋…" },
    { k: "amount", label: "吃了多少", type: "seg", opts: ["尝一口", "几口", "一半", "大部分", "吃完"] },
    { k: "newFood", label: "第一次尝试的新食物", type: "check" },
    { k: "reaction", label: "吃完后的反应", type: "seg", opts: ["无", "皮疹", "呕吐", "腹泻", "拒绝"], def: "无" },
    { k: "note", label: "备注", type: "text", ph: "喜欢 / 不喜欢、呛咳…" } ] },
  milestone: { label: "里程碑", icon: "⭐", color: "#D98E2B", fields: [
    { k: "cat", label: "类别", type: "seg", opts: ["大运动", "精细动作", "语言", "社交情绪", "认知", "自理"], def: "大运动" },
    { k: "name", label: "做到了什么", type: "text", list: "milestonelist", ph: "翻身、独坐、扶站、第一次叫妈妈…" },
    { k: "note", label: "备注", type: "area", ph: "当时的情形、谁看到的…" } ] },
  /* ---- 幼儿期起 ---- */
  potty: { label: "如厕", icon: "🚽", color: "var(--sky)", fields: [
    { k: "what", label: "内容", type: "seg", opts: ["尿", "便", "尿+便", "坐了没出"], def: "尿" },
    { k: "where", label: "在哪儿", type: "seg", opts: ["小马桶", "马桶", "尿裤里", "裤子湿了"], def: "小马桶" },
    { k: "self", label: "自己提出要去", type: "check" },
    { k: "note", label: "备注", type: "text" } ] },
  speech: { label: "语言", icon: "💬", color: "#5B8E5A", fields: [
    { k: "kind", label: "类型", type: "seg", opts: ["新词", "短句", "会指认", "听懂指令", "会问问题"], def: "新词" },
    { k: "words", label: "说了什么", type: "text", ph: "妈妈 / 要抱抱 / 这是什么…" },
    { k: "lang", label: "语言", type: "seg", opts: ["中文", "英文", "其他"] },
    { k: "note", label: "备注", type: "text" } ] },
  activity: { label: "活动", icon: "🎨", color: "#7A6FB5", fields: [
    { k: "kind", label: "活动", type: "seg", opts: ["阅读", "户外", "游戏", "社交", "音乐运动", "幼儿园", "屏幕"], def: "阅读" },
    { k: "minutes", label: "时长（分钟）", type: "num", half: 1 },
    { k: "what", label: "内容", type: "text", half: 1, ph: "书名、公园、和谁一起…" },
    { k: "note", label: "备注", type: "area", ph: "表现、感受…" } ] },
  behavior: { label: "情绪行为", icon: "🙂", color: "var(--rose)", fields: [
    { k: "kind", label: "情况", type: "seg", opts: ["开心", "发脾气", "哭闹", "分离焦虑", "害怕", "打人/咬人", "分享合作"], def: "开心" },
    { k: "trigger", label: "起因", type: "text", ph: "不让看电视、玩具被抢…" },
    { k: "how", label: "怎么处理的", type: "text", ph: "抱着安抚、冷静角、转移注意…" },
    { k: "minutes", label: "持续（分钟）", type: "num" },
    { k: "note", label: "备注", type: "text" } ] },
  /* ---- 妈妈（家庭级，不随孩子切换） ---- */
  mmed:  { label: "妈妈用药", icon: "💊", color: "var(--rose)", fields: [
    { k: "cat", label: "类别", type: "seg", opts: ["止疼药", "维生素", "铁剂", "其他"], def: "止疼药" },
    { k: "name", label: "药名", type: "text", list: "medlist", ph: "布洛芬 / 泰诺…" },
    { k: "dose", label: "剂量", type: "text", ph: "如 1片" },
    { k: "note", label: "备注", type: "text" } ] },
  mbody: { label: "妈妈身体", icon: "♡", color: "#9B7BB8", fields: [
    { k: "weight", label: "体重", type: "num", dim: "wmom", step: .1, half: 1 },
    { k: "sleepHrs", label: "昨晚睡了（小时）", type: "num", step: .5, half: 1 },
    { k: "lochia", label: "恶露量", type: "seg", opts: ["无", "少", "中", "多", "1小时浸透1片"] },
    { k: "lcolor", label: "恶露颜色", type: "seg", opts: ["鲜红", "粉/褐", "黄白"] },
    { k: "pain", label: "疼痛（0 无痛 – 10 最痛）", type: "range", min: 0, max: 10 },
    { k: "mood", label: "心情（1 很低落 – 5 很好）", type: "range", min: 1, max: 5 },
    { k: "exercise", label: "恢复运动（分钟）", type: "num", half: 1, ph: "凯格尔、散步…" },
    { k: "bp", label: "血压（选填）", type: "text", half: 1, ph: "120/80" },
    { k: "note", label: "备注", type: "area", ph: "伤口、乳房胀痛、情绪…" } ] }
};
const typeLabel = type => t((TYPES[type] || {}).label || type);
// a baby-health record taken at a clinic (well-child checkup or sick visit) rather than at home
const isVisit = e => e.type === "baby" && !!e.src && e.src !== "自己记录";

// one line per record for lists, tables and CSV; stored option values are translated, free text is not
function summary(e){
  const p = [];
  const v = x => x ? t(x) : "";
  switch (e.type) {
    case "feed":
      p.push(v(e.method) || t("喂奶"));
      if (e.left) p.push(t("左{n}分", { n: e.left })); if (e.right) p.push(t("右{n}分", { n: e.right })); if (e.ml) p.push(fmtU("vol", e.ml)); break;
    case "diaper": if (e.pee) p.push(t("尿")); if (e.poop) p.push(e.color ? t("{label}（{u}）", { label: t("便"), u: t(e.color) }) : t("便")); break;
    case "sleep": p.push(e.end ? t("睡到 {t} · {d}", { t: hm(e.end), d: dur(e.end - e.ts) }) : t("正在睡")); if (e.where) p.push(t(e.where)); if (e.how) p.push(t(e.how)); break;
    case "baby": if (isVisit(e)) p.push(t(e.src)); if (e.temp) p.push(`${t("体温")} ${fmtU("temp", e.temp)}`); if (e.weight) p.push(`${t("体重")} ${fmtU("wbaby", e.weight)}`); if (e.length) p.push(`${t("身长")} ${fmtU("len", e.length)}`); if (e.head) p.push(`${t("头围")} ${fmtU("len", e.head)}`); if (!p.length) p.push(t("健康记录")); break;
    case "bmed": p.push(v(e.cat), e.name || "", e.dose || ""); break;
    case "mmed": p.push(v(e.cat), e.name || "", e.dose || ""); break;
    case "vax": p.push(e.name || t("疫苗"), v(e.dose), v(e.site), e.reaction && e.reaction !== "无" ? t("反应：{r}", { r: t(e.reaction) }) : ""); break;
    case "mbody": if (e.weight) p.push(`${t("体重")} ${fmtU("wmom", e.weight)}`); if (e.lochia) p.push(`${t("恶露")} ${t(e.lochia)}`); if (e.pain != null) p.push(`${t("疼痛")} ${e.pain}`); if (e.mood != null) p.push(`${t("心情")} ${e.mood}/5`); if (e.sleepHrs) p.push(t("睡 {h}h", { h: e.sleepHrs })); break;
    case "food": p.push(v(e.meal), e.foods || "", v(e.amount), e.newFood ? t("新食物") : "", e.reaction && e.reaction !== "无" ? t("反应：{r}", { r: t(e.reaction) }) : ""); break;
    case "milestone": p.push(v(e.cat), e.name || t("里程碑")); break;
    case "potty": p.push(v(e.what), v(e.where), e.self ? t("自己说要去") : ""); break;
    case "speech": p.push(v(e.kind), e.words ? `「${e.words}」` : "", e.lang && e.lang !== "中文" ? t(e.lang) : ""); break;
    case "activity": p.push(v(e.kind) || t("活动"), e.what || "", e.minutes ? t("{n}分钟", { n: e.minutes }) : ""); break;
    case "behavior": p.push(v(e.kind), e.trigger ? t("起因：{s}", { s: e.trigger }) : "", e.minutes ? t("{n}分钟", { n: e.minutes }) : "", e.how ? t("处理：{s}", { s: e.how }) : ""); break;
  }
  return p.filter(Boolean).join(" · ");
}
function flags(e){
  const f = [];
  const ageDays = babyAgeDays(e.ts, childOf(e));
  if (e.type === "baby" && e.temp >= 38) f.push(ageDays != null && ageDays < 90 ? t("3个月内宝宝体温≥38℃：请立即联系儿科医生或急诊") : t("发热：留意精神状态，按医生建议处理"));
  if (e.type === "diaper" && e.poop && e.color === "白/灰白") f.push(t("灰白色大便可能提示肝胆问题，请尽快就医"));
  if (e.type === "diaper" && e.poop && e.color === "带血") f.push(t("大便带血：请联系儿科医生"));
  if (e.type === "diaper" && e.poop && e.color === "黑（胎便）" && ageDays != null && ageDays > 5) f.push(t("出生5天后仍为黑色大便：请咨询医生"));
  if (e.type === "food" && ["皮疹", "呕吐", "腹泻"].includes(e.reaction)) f.push(t("进食后{r}可能是食物过敏：记下吃了什么并咨询医生；如出现嘴唇或面部肿胀、呼吸困难、全身荨麻疹，请立即就医", { r: t(e.reaction) }));
  if (e.type === "vax" && ["发热", "其他"].includes(e.reaction)) f.push(t("接种后若出现高热、持续哭闹超过3小时、呼吸困难、面部肿胀或全身荨麻疹，请及时就医"));
  if (e.type === "mbody" && e.lochia === "1小时浸透1片") f.push(t("出血量大（约1小时浸透1片卫生巾）：属于紧急警示信号，请立即就医"));
  if (e.type === "mbody" && e.mood != null && e.mood <= 1) f.push(t("如果持续低落或有伤害自己/宝宝的念头，请马上联系医生或身边可信任的人"));
  return f;
}

export { TYPES, typeLabel, isVisit, summary, flags };
