import { expectedDiapers, sleepMsIn } from "./derived.js";
import { S, ageMonths, babyAgeDays, birthTs, stageOf, vis } from "./state.js";
import { TYPES } from "./types.js";
import { isUS, toDisp, trim, unitOf } from "./units.js";
import { D, H, esc } from "./util.js";

/* ============ stage configuration ============
   One place that says what each growth stage shows: quick buttons and 24h stats on Today, which record
   types the list filter / 补记 picker offer first, which trend metrics are relevant, and the milestone
   references on the grow page. Everything else (forms, sync, charts) is shared across stages. */

const mealByHour = () => { const h = new Date().getHours(); return h < 10 ? "早餐" : h < 14 ? "午餐" : h < 16 ? "加餐" : h < 20 ? "晚餐" : "加餐"; };
const Q = {
  nurse:   { add: "feed", preset: { method: "亲喂" }, icon: "🤱", label: "亲喂" },
  bottle:  { add: "feed", preset: { method: "母乳瓶喂" }, icon: "🍼", label: "瓶喂母乳" },
  formula: { add: "feed", preset: { method: "配方奶" }, icon: "🥛", label: "配方奶" },
  milk:    { add: "feed", icon: "🥛", label: "喝奶" }, // method defaults by age and last choice (see types.js)
  solids:  { add: "food", preset: { meal: "辅食" }, icon: "🥣", label: "辅食" },
  meal:    { add: "food", preset: () => ({ meal: mealByHour() }), icon: "🍚", label: "吃饭" },
  diaper:  { add: "diaper", icon: "🧷", label: "换尿布" },
  potty:   { add: "potty", icon: "🚽", label: "如厕" },
  sleep:   { act: "sleepnow", icon: "🌙", label: "开始睡" },
  mmed:    { add: "mmed", icon: "💊", label: "妈妈用药" },
  mbody:   { add: "mbody", icon: "♡", label: "妈妈身体" },
  health:  { add: "baby", icon: "🌡", label: "宝宝健康" },
  milestone: { add: "milestone", icon: "⭐", label: "里程碑" },
  speech:  { add: "speech", icon: "💬", label: "语言" },
  activity:{ add: "activity", icon: "🎨", label: "活动" },
  read:    { add: "activity", preset: { kind: "阅读" }, icon: "📚", label: "阅读" },
  outdoor: { add: "activity", preset: { kind: "户外" }, icon: "🌳", label: "户外" },
  school:  { add: "activity", preset: { kind: "幼儿园" }, icon: "🏫", label: "幼儿园" },
  behavior:{ add: "behavior", icon: "🙂", label: "情绪行为" }
};
const STAGE = {
  newborn:   { quick: ["nurse", "bottle", "formula", "diaper", "sleep", "mmed", "mbody", "health"],
               types: ["feed", "diaper", "sleep", "baby", "bmed", "vax"],
               metrics: ["sleep", "longest", "ml", "nurse", "feeds", "wet", "poop", "pump"] },
  infant:    { quick: ["nurse", "bottle", "formula", "solids", "diaper", "sleep", "milestone", "health"],
               types: ["feed", "food", "diaper", "sleep", "milestone", "baby", "bmed", "vax"],
               metrics: ["sleep", "longest", "ml", "nurse", "feeds", "food", "wet", "poop"] },
  toddler:   { quick: ["meal", "milk", "potty", "diaper", "sleep", "speech", "activity", "health"],
               types: ["food", "feed", "potty", "diaper", "sleep", "speech", "activity", "milestone", "behavior", "baby", "bmed", "vax"],
               metrics: ["sleep", "longest", "food", "ml", "potty", "outdoor", "read", "words", "tantrum"] },
  preschool: { quick: ["meal", "read", "outdoor", "school", "behavior", "potty", "sleep", "health"],
               types: ["food", "activity", "behavior", "potty", "sleep", "speech", "milestone", "baby", "bmed", "vax", "feed", "diaper"],
               metrics: ["sleep", "read", "outdoor", "screen", "food", "tantrum", "words", "potty"] }
};
const stageCfg = () => STAGE[stageOf().key];
const stageTypes = () => stageCfg().types;
const stageMetrics = () => stageCfg().metrics;

function quickHTML(){
  return stageCfg().quick.map(k => {
    const q = Q[k];
    if (q.act) return `<button data-act="${q.act}"><i>${q.icon}</i>${q.label}</button>`;
    const preset = typeof q.preset === "function" ? q.preset() : q.preset;
    return `<button data-add="${q.add}" ${preset ? `data-preset="${esc(JSON.stringify(preset))}"` : ""}><i>${q.icon}</i>${q.label}</button>`;
  }).join("");
}

/* ---- 24h stats on Today ---- */
const stat = (k, v, ref = "") => `<div class="stat"><div class="k">${k}</div><div class="v num">${v}</div>${ref}</div>`;
const n = (x, u = "次") => `${x}<small>${u}</small>`;
const vol = ml => `${trim(toDisp("vol", ml), isUS() ? 1 : 0)}<small>${unitOf("vol")}</small>`;
const sumMin = list => list.reduce((a, e) => a + (+e.minutes || 0), 0);
function statsHTML(day){
  const key = stageOf().key;
  const feeds = day.filter(e => e.type === "feed" && e.method !== "吸奶");
  const ml = feeds.reduce((a, e) => a + (+e.ml || 0), 0);
  const wet = day.filter(e => e.type === "diaper" && e.pee).length, poop = day.filter(e => e.type === "diaper" && e.poop).length;
  const sleep = stat("睡眠", `${Math.round(sleepMsIn(Date.now() - D, Date.now()) / H * 10) / 10}<small>小时</small>`);
  const foods = day.filter(e => e.type === "food");
  const act = kind => sumMin(day.filter(e => e.type === "activity" && e.kind === kind));
  if (key === "newborn") {
    const L = feeds.reduce((a, e) => a + (+e.left || 0), 0), R = feeds.reduce((a, e) => a + (+e.right || 0), 0);
    const exp = expectedDiapers(babyAgeDays());
    return stat("喂奶次数", n(feeds.length), `<div class="ref ${feeds.length && feeds.length < 8 ? "warn" : ""}">新生儿通常 8–12 次</div>`)
      + stat("瓶喂总量", vol(ml))
      + stat("亲喂 左 / 右", `${L}<small>分</small> ${R}<small>分</small>`)
      + stat("湿尿布 / 大便", `${n(wet)} ${n(poop)}`, birthTs() ? `<div class="ref ${wet < exp.wet ? "warn" : ""}">参考：至少 ${exp.wet} 次湿尿布${exp.poop ? `、${exp.poop} 次大便` : ""}</div>` : "")
      + sleep;
  }
  if (key === "infant") {
    const newFoods = foods.filter(f => f.newFood).length;
    return stat("喂奶次数", n(feeds.length)) + stat("瓶喂总量", vol(ml))
      + stat("辅食", n(foods.length), newFoods ? `<div class="ref">今天试了 ${newFoods} 种新食物</div>` : "")
      + stat("湿尿布 / 大便", `${n(wet)} ${n(poop)}`) + sleep;
  }
  const potty = day.filter(e => e.type === "potty");
  const ok = potty.filter(p => ["小马桶", "马桶"].includes(p.where) && p.what !== "坐了没出").length;
  const upset = day.filter(e => e.type === "behavior" && ["发脾气", "哭闹"].includes(e.kind)).length;
  if (key === "toddler") {
    return stat("吃饭", n(foods.filter(f => f.meal !== "奶").length)) + stat("喝奶", vol(ml))
      + stat("如厕 成功 / 总", `${n(ok)} ${n(potty.length)}`) + stat("尿布", n(day.filter(e => e.type === "diaper").length))
      + stat("户外 / 阅读", `${act("户外")}<small>分</small> ${act("阅读")}<small>分</small>`) + sleep;
  }
  return stat("吃饭", n(foods.length)) + stat("阅读", `${act("阅读")}<small>分钟</small>`)
    + stat("户外", `${act("户外")}<small>分钟</small>`) + stat("屏幕", `${act("屏幕")}<small>分钟</small>`, act("屏幕") > 60 ? `<div class="ref warn">AAP 建议 2–5 岁每天不超过 1 小时高质量内容</div>` : "")
    + stat("发脾气 / 哭闹", n(upset)) + sleep;
}

/* ---- milestone references (CDC "Learn the Signs. Act Early." 2022, abridged) ---- */
const MILESTONE_REF = [
  { m: 2, items: [["社交情绪", "看到你会微笑"], ["语言", "会发出“啊”“咕”的声音"], ["大运动", "趴着时能抬头"], ["认知", "眼睛跟着你移动"]] },
  { m: 4, items: [["社交情绪", "逗他会笑出声"], ["语言", "会咿呀回应你说话"], ["大运动", "趴着时能用前臂撑起"], ["精细动作", "能握住放到手里的玩具"]] },
  { m: 6, items: [["社交情绪", "认得熟悉的人"], ["语言", "会和你轮流发声像在对话"], ["大运动", "从趴翻到仰"], ["认知", "把东西放进嘴里探索"]] },
  { m: 9, items: [["社交情绪", "见到陌生人会害羞或紧张"], ["语言", "会发“妈妈”“巴巴”这样的音"], ["大运动", "不用扶能自己坐稳"], ["精细动作", "把东西从一只手换到另一只手"]] },
  { m: 12, items: [["社交情绪", "会玩拍手、躲猫猫"], ["语言", "会挥手再见"], ["大运动", "扶着家具走"], ["精细动作", "用拇指和食指捏起小东西"]] },
  { m: 15, items: [["社交情绪", "会模仿其他孩子玩"], ["语言", "除了爸爸妈妈会说 1–2 个词"], ["大运动", "自己走几步"], ["精细动作", "会叠两块积木"]] },
  { m: 18, items: [["社交情绪", "会指给你看有趣的东西"], ["语言", "会说 3 个以上的词"], ["大运动", "不扶东西自己走"], ["自理", "会试着用勺子吃"]] },
  { m: 24, items: [["社交情绪", "看到别人难过会注意到"], ["语言", "会说两个词的短句，如“要奶”"], ["大运动", "会踢球"], ["自理", "会用勺子吃饭"]] },
  { m: 30, items: [["社交情绪", "会和其他孩子一起玩"], ["语言", "会说大约 50 个词"], ["大运动", "双脚离地跳"], ["自理", "会自己脱一些衣服"]] },
  { m: 36, items: [["社交情绪", "你离开后 10 分钟内能平静下来"], ["语言", "能和你对话两个来回"], ["精细动作", "会画圆"], ["自理", "会自己穿一些衣服"]] },
  { m: 48, items: [["社交情绪", "会玩假装游戏，比如当老师"], ["语言", "会说 4 个词以上的句子"], ["大运动", "会接住大球"], ["自理", "会自己解扣子"]] },
  { m: 60, items: [["社交情绪", "玩游戏时会遵守规则、轮流"], ["语言", "会讲一个有两件事的故事"], ["大运动", "单脚跳"], ["精细动作", "会写自己名字里的一些字"]] }
];
// the checkpoint to show now: the first one at or after the child's age, else the last
function milestoneRef(){
  const m = ageMonths(); if (m == null) return null;
  return MILESTONE_REF.find(r => r.m >= m) || MILESTONE_REF[MILESTONE_REF.length - 1];
}
const milestoneNames = () => MILESTONE_REF.flatMap(r => r.items.map(i => i[1]));
function milestoneRefHTML(){
  const ref = milestoneRef(); if (!ref) return "";
  const done = new Set(vis().filter(e => e.type === "milestone").map(e => (e.name || "").trim()));
  const label = ref.m < 24 ? `${ref.m} 个月` : ref.m % 12 ? `${Math.floor(ref.m / 12)} 岁半` : `${ref.m / 12} 岁`;
  return `<h3 class="small muted" style="margin-top:12px">${label}左右常见的里程碑 · 点一下记录</h3>
  <div class="ms">${ref.items.map(([cat, name]) => `<button class="chip ${done.has(name) ? "done" : ""}" data-add="milestone" data-preset="${esc(JSON.stringify({ cat, name }))}"><span class="cat">${cat}</span>${esc(name)}${done.has(name) ? " ✓" : ""}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:8px">整理自美国 CDC「Learn the Signs. Act Early.」（2022 版，大多数孩子在该月龄能做到的事）。个体差异很大，不是诊断标准；担心时和儿科医生聊。</p>`;
}

/* ---- when to call the doctor, by stage ---- */
function doctorListHTML(){
  if (stageOf().key === "newborn") return `<ul class="plain">
    <li><b>3 个月以内</b>体温 ≥ 38℃（100.4℉）：立即联系医生或去急诊，不要先自行用退烧药。</li>
    <li>呼吸急促、费力，嘴唇发青，或很难叫醒、异常软。</li>
    <li>湿尿布明显变少（出生第 5 天后 24 小时少于 6 次），嘴唇干、哭时无泪。</li>
    <li>皮肤或眼白越来越黄，尤其蔓延到腹部和腿，或出生 24 小时内就发黄。</li>
    <li>大便灰白色、带血，或持续喷射性呕吐、呕吐物呈绿色。</li>
    <li>连续几次拒奶，或体重没有按医生预期回升。</li>
    <li>脐带周围红肿、有臭味或流脓。</li>
  </ul>`;
  return `<ul class="plain">
    <li>发热伴精神差、持续 2–3 天不退，或体温 ≥ 40℃（104℉）。</li>
    <li>呼吸急促、费力，嘴唇发青，或很难叫醒。</li>
    <li>脱水：尿明显变少、嘴唇干、哭时无泪、异常没精神。</li>
    <li>持续呕吐或腹泻，大便带血，或剧烈腹痛。</li>
    <li>抽搐、颈部僵硬、发热伴按压不褪色的皮疹。</li>
    <li>头部摔伤后呕吐、嗜睡或行为异常。</li>
    <li>吃了新食物后嘴唇面部肿胀、呼吸困难、全身荨麻疹：立即就医。</li>
  </ul>`;
}

const typeLabel = t => (TYPES[t] || {}).label || t;

export { STAGE, stageCfg, stageTypes, stageMetrics, quickHTML, statsHTML, MILESTONE_REF, milestoneRef, milestoneNames, milestoneRefHTML, doctorListHTML, typeLabel };
