import { babyAgeDays, childOf } from "./state.js";
import { fmtU } from "./units.js";
import { $, D, dur, hm, num } from "./util.js";

/* ============ record types ============ */
const TYPES = {
  feed:  { label: "喂奶", icon: "🍼", color: "var(--honey)", fields: [
    { k: "method", label: "方式", type: "seg", opts: ["亲喂", "母乳瓶喂", "配方奶", "混合", "吸奶"], def: "亲喂" },
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

function summary(e){
  const p = [];
  switch (e.type) {
    case "feed":
      p.push(e.method || "喂奶");
      if (e.left) p.push(`左${e.left}分`); if (e.right) p.push(`右${e.right}分`); if (e.ml) p.push(fmtU("vol", e.ml)); break;
    case "diaper": if (e.pee) p.push("尿"); if (e.poop) p.push("便" + (e.color ? `（${e.color}）` : "")); break;
    case "sleep": p.push(e.end ? `睡到 ${hm(e.end)} · ${dur(e.end - e.ts)}` : "正在睡"); if (e.where) p.push(e.where); if (e.how) p.push(e.how); break;
    case "baby": if (e.temp) p.push(`体温 ${fmtU("temp", e.temp)}`); if (e.weight) p.push(`体重 ${fmtU("wbaby", e.weight)}`); if (e.length) p.push(`身长 ${fmtU("len", e.length)}`); if (e.head) p.push(`头围 ${fmtU("len", e.head)}`); if (!p.length) p.push("健康记录"); break;
    case "bmed": p.push(e.cat || "", e.name || "", e.dose || ""); break;
    case "mmed": p.push(e.cat || "", e.name || "", e.dose || ""); break;
    case "vax": p.push(e.name || "疫苗", e.dose || "", e.site || "", e.reaction && e.reaction !== "无" ? "反应：" + e.reaction : ""); break;
    case "mbody": if (e.weight) p.push(`体重 ${fmtU("wmom", e.weight)}`); if (e.lochia) p.push(`恶露 ${e.lochia}`); if (e.pain != null) p.push(`疼痛 ${e.pain}`); if (e.mood != null) p.push(`心情 ${e.mood}/5`); if (e.sleepHrs) p.push(`睡 ${e.sleepHrs}h`); break;
  }
  return p.filter(Boolean).join(" · ");
}
function flags(e){
  const f = [];
  const ageDays = babyAgeDays(e.ts, childOf(e));
  if (e.type === "baby" && e.temp >= 38) f.push(ageDays != null && ageDays < 90 ? "3个月内宝宝体温≥38℃：请立即联系儿科医生或急诊" : "发热：留意精神状态，按医生建议处理");
  if (e.type === "diaper" && e.poop && e.color === "白/灰白") f.push("灰白色大便可能提示肝胆问题，请尽快就医");
  if (e.type === "diaper" && e.poop && e.color === "带血") f.push("大便带血：请联系儿科医生");
  if (e.type === "diaper" && e.poop && e.color === "黑（胎便）" && ageDays != null && ageDays > 5) f.push("出生5天后仍为黑色大便：请咨询医生");
  if (e.type === "vax" && ["发热", "其他"].includes(e.reaction)) f.push("接种后若出现高热、持续哭闹超过3小时、呼吸困难、面部肿胀或全身荨麻疹，请及时就医");
  if (e.type === "mbody" && e.lochia === "1小时浸透1片") f.push("出血量大（约1小时浸透1片卫生巾）：属于紧急警示信号，请立即就医");
  if (e.type === "mbody" && e.mood != null && e.mood <= 1) f.push("如果持续低落或有伤害自己/宝宝的念头，请马上联系医生或身边可信任的人");
  return f;
}

export { TYPES, summary, flags };
