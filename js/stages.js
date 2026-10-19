import { expectedDiapers, sleepMsIn } from "./derived.js";
import { t } from "./i18n.js";
import { S, ageMonths, babyAgeDays, birthTs, stageOf, vis } from "./state.js";
import { TYPES } from "./types.js";
import { isUS, toDisp, trim, unitOf } from "./units.js";
import { D, H, esc } from "./util.js";

/* ============ stage configuration ============
   One place that says what each growth stage shows: quick buttons and 24h stats on Today, which record
   types the list filter / 补记 picker offer first, which trend metrics are relevant, and the milestone
   references on the grow page. Everything else (forms, sync, charts) is shared across stages.
   The quick buttons and stats are "cards": each child can switch cards off or add ones from another stage
   (settings.cardPrefs, see activeCards). Switching a card off only hides it; records are never touched. */

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
  screen:  { add: "activity", preset: { kind: "屏幕" }, icon: "📱", label: "屏幕" },
  behavior:{ add: "behavior", icon: "🙂", label: "情绪行为" },
  companion: { add: "companion", icon: "🤗", label: "陪伴" },
  mood:    { add: "mood", icon: "🌤", label: "情绪" },
  habit:   { add: "habit", icon: "🎯", label: "自律" },
  social:  { add: "social", icon: "👫", label: "社交" }
};
// hero: what the big clock on Today counts since — the last feed, the last meal, or the last time together
const STAGE = {
  newborn:   { hero: "feed",
               quick: ["nurse", "bottle", "formula", "diaper", "sleep", "mmed", "mbody", "health"],
               stats: ["hero", "feeds", "bottle", "nursing", "wetpoop", "sleep"],
               types: ["feed", "diaper", "sleep", "baby", "bmed", "vax"],
               metrics: ["sleep", "longest", "ml", "nurse", "feeds", "wet", "poop", "pump"] },
  infant:    { hero: "feed",
               quick: ["nurse", "bottle", "formula", "solids", "diaper", "sleep", "milestone", "health"],
               stats: ["hero", "feeds", "bottle", "solids", "wetpoop", "sleep"],
               types: ["feed", "food", "diaper", "sleep", "milestone", "baby", "bmed", "vax"],
               metrics: ["sleep", "longest", "ml", "nurse", "feeds", "food", "wet", "poop"] },
  toddler:   { hero: "meal",
               quick: ["meal", "milk", "potty", "diaper", "sleep", "speech", "activity", "health"],
               stats: ["hero", "meals", "milk", "potty", "diapers", "outdoorRead", "sleep"],
               types: ["food", "feed", "potty", "diaper", "sleep", "speech", "activity", "milestone", "behavior", "baby", "bmed", "vax"],
               metrics: ["sleep", "longest", "food", "ml", "potty", "outdoor", "read", "words", "tantrum"] },
  preschool: { hero: "meal",
               quick: ["meal", "read", "outdoor", "school", "behavior", "potty", "sleep", "health"],
               stats: ["hero", "meals", "read", "outdoor", "screen", "upset", "sleep"],
               types: ["food", "activity", "behavior", "potty", "sleep", "speech", "milestone", "baby", "bmed", "vax", "feed", "diaper"],
               metrics: ["sleep", "read", "outdoor", "screen", "food", "tantrum", "words", "potty"] },
  school:    { hero: "companion",
               quick: ["companion", "mood", "habit", "social", "read", "outdoor", "screen", "health"],
               stats: ["hero", "companion", "mood", "habit", "social", "screen", "sleep"],
               types: ["companion", "mood", "habit", "social", "activity", "food", "sleep", "milestone", "baby", "bmed", "vax", "behavior", "speech"],
               metrics: ["companion", "mood", "habit", "social", "read", "outdoor", "screen", "sleep"] },
  teen:      { hero: "companion",
               quick: ["companion", "mood", "habit", "social", "screen", "read", "outdoor", "health"],
               stats: ["hero", "companion", "mood", "habit", "social", "screen", "outdoor"],
               types: ["companion", "mood", "habit", "social", "activity", "sleep", "baby", "bmed", "vax", "milestone", "food"],
               metrics: ["companion", "mood", "habit", "social", "screen", "sleep", "outdoor", "read"] }
};
const stageCfg = () => STAGE[stageOf().key];
const stageTypes = () => stageCfg().types;
const stageMetrics = () => stageCfg().metrics;

/* ---- cards: the stage's defaults, adjusted per child ----
   settings.cardPrefs[child][kind] = { on: [keys added from outside the stage], off: [stage keys hidden] }.
   Storing only the differences keeps a child who never touched the settings on the stage defaults. */
const REG = () => ({ quick: Q, stats: STATS });
const prefOf = (kind, cid) => ((S.settings.cardPrefs || {})[cid] || {})[kind] || { on: [], off: [] };
function activeCards(kind, cid = S.childId){
  const reg = REG()[kind], def = STAGE[stageOf(cid).key][kind], p = prefOf(kind, cid);
  return [...def.filter(k => !p.off.includes(k)), ...p.on.filter(k => !def.includes(k))].filter(k => reg[k]);
}
function setCard(kind, key, on, cid = S.childId){
  const def = STAGE[stageOf(cid).key][kind];
  const all = S.settings.cardPrefs ||= {}, kids = all[cid] ||= { quick: { on: [], off: [] }, stats: { on: [], off: [] } };
  const p = kids[kind] ||= { on: [], off: [] };
  p.on = p.on.filter(k => k !== key); p.off = p.off.filter(k => k !== key);
  if (on && !def.includes(key)) p.on.push(key);
  if (!on && def.includes(key)) p.off.push(key);
}
function resetCards(cid = S.childId){ if (S.settings.cardPrefs) delete S.settings.cardPrefs[cid]; }
const hasCardPrefs = (cid = S.childId) => { const p = (S.settings.cardPrefs || {})[cid]; return !!p && ["quick", "stats"].some(k => p[k] && (p[k].on.length || p[k].off.length)); };
// every card the child can show, the stage's own first, for the card manager
function allCards(kind, cid = S.childId){
  const reg = REG()[kind], def = STAGE[stageOf(cid).key][kind], on = new Set(activeCards(kind, cid));
  const row = k => ({ key: k, label: reg[k].label, icon: reg[k].icon, on: on.has(k) });
  return { common: def.map(row), other: Object.keys(reg).filter(k => !def.includes(k)).map(row) };
}

function quickHTML(){
  return activeCards("quick").map(k => {
    const q = Q[k];
    if (q.act) return `<button data-act="${q.act}"><i>${q.icon}</i>${t(q.label)}</button>`;
    const preset = typeof q.preset === "function" ? q.preset() : q.preset;
    return `<button data-add="${q.add}" ${preset ? `data-preset="${esc(JSON.stringify(preset))}"` : ""}><i>${q.icon}</i>${t(q.label)}</button>`;
  }).join("");
}

/* ---- 24h stats on Today ---- */
const stat = (k, v, ref = "") => `<div class="stat"><div class="k">${k}</div><div class="v num">${v}</div>${ref}</div>`;
const n = (x, u = t("次")) => `${x}<small>${u}</small>`;
const vol = ml => `${trim(toDisp("vol", ml), isUS() ? 1 : 0)}<small>${unitOf("vol")}</small>`;
const sumMin = list => list.reduce((a, e) => a + (+e.minutes || 0), 0);
const min = x => `${x}<small>${t("分")}</small>`;
const mins = x => `${x}<small>${t("分钟")}</small>`;
const feedsOf = day => day.filter(e => e.type === "feed" && e.method !== "吸奶");
const mlOf = day => feedsOf(day).reduce((a, e) => a + (+e.ml || 0), 0);
const ofType = (day, type) => day.filter(e => e.type === type);
const actMin = (day, kind) => sumMin(day.filter(e => e.type === "activity" && e.kind === kind));
// label is the heading on Today and the name in the card manager; hero is the big clock, not a tile
const STATS = {
  hero:     { label: "顶部计时", icon: "⏱" },
  feeds:    { label: "喂奶次数", icon: "🍼", render: day => {
    const f = feedsOf(day).length;
    return stat(t("喂奶次数"), n(f), stageOf().key === "newborn" ? `<div class="ref ${f && f < 8 ? "warn" : ""}">${t("新生儿通常 8–12 次")}</div>` : "");
  } },
  bottle:   { label: "瓶喂总量", icon: "🍼", render: day => stat(t("瓶喂总量"), vol(mlOf(day))) },
  nursing:  { label: "亲喂 左 / 右", icon: "🤱", render: day => {
    const f = feedsOf(day);
    return stat(t("亲喂 左 / 右"), `${min(f.reduce((a, e) => a + (+e.left || 0), 0))} ${min(f.reduce((a, e) => a + (+e.right || 0), 0))}`);
  } },
  wetpoop:  { label: "湿尿布 / 大便", icon: "🧷", render: day => {
    const wet = day.filter(e => e.type === "diaper" && e.pee).length, poop = day.filter(e => e.type === "diaper" && e.poop).length;
    let ref = "";
    if (stageOf().key === "newborn" && birthTs()) {
      const exp = expectedDiapers(babyAgeDays());
      ref = `<div class="ref ${wet < exp.wet ? "warn" : ""}">${t("参考：至少 {n} 次湿尿布", { n: exp.wet })}${exp.poop ? t("、{n} 次大便", { n: exp.poop }) : ""}</div>`;
    }
    return stat(t("湿尿布 / 大便"), `${n(wet)} ${n(poop)}`, ref);
  } },
  solids:   { label: "辅食", icon: "🥣", render: day => {
    const foods = ofType(day, "food"), fresh = foods.filter(f => f.newFood).length;
    return stat(t("辅食"), n(foods.length), fresh ? `<div class="ref">${t("今天试了 {n} 种新食物", { n: fresh })}</div>` : "");
  } },
  meals:    { label: "吃饭", icon: "🍚", render: day => stat(t("吃饭"), n(ofType(day, "food").filter(f => f.meal !== "奶").length)) },
  milk:     { label: "喝奶", icon: "🥛", render: day => stat(t("喝奶"), vol(mlOf(day))) },
  potty:    { label: "如厕 成功 / 总", icon: "🚽", render: day => {
    const potty = ofType(day, "potty"), ok = potty.filter(p => ["小马桶", "马桶"].includes(p.where) && p.what !== "坐了没出").length;
    return stat(t("如厕 成功 / 总"), `${n(ok)} ${n(potty.length)}`);
  } },
  diapers:  { label: "尿布", icon: "🧷", render: day => stat(t("尿布"), n(ofType(day, "diaper").length)) },
  outdoorRead: { label: "户外 / 阅读", icon: "🌳", render: day => stat(t("户外 / 阅读"), `${min(actMin(day, "户外"))} ${min(actMin(day, "阅读"))}`) },
  read:     { label: "阅读", icon: "📚", render: day => stat(t("阅读"), mins(actMin(day, "阅读"))) },
  outdoor:  { label: "户外", icon: "🌳", render: day => stat(t("户外"), mins(actMin(day, "户外"))) },
  screen:   { label: "屏幕", icon: "📱", render: day => {
    const m = actMin(day, "屏幕"), young = ageMonths() != null && ageMonths() < 72; // the AAP reference is for 2–5 year olds
    return stat(t("屏幕"), mins(m), young && m > 60 ? `<div class="ref warn">${t("AAP 建议 2–5 岁每天不超过 1 小时高质量内容")}</div>` : "");
  } },
  upset:    { label: "发脾气 / 哭闹", icon: "🙂", render: day => stat(t("发脾气 / 哭闹"), n(ofType(day, "behavior").filter(e => ["发脾气", "哭闹"].includes(e.kind)).length)) },
  companion:{ label: "陪伴", icon: "🤗", render: day => stat(t("陪伴"), mins(sumMin(ofType(day, "companion")))) },
  mood:     { label: "心情", icon: "🌤", render: day => {
    const lv = ofType(day, "mood").map(e => e.level).filter(v => v != null);
    return stat(t("心情"), lv.length ? `${Math.round(lv.reduce((a, b) => a + b, 0) / lv.length * 10) / 10}<small>/5</small>` : "–");
  } },
  habit:    { label: "自律 自己做到 / 总", icon: "🎯", render: day => {
    const h = ofType(day, "habit");
    return stat(t("自律 自己做到 / 总"), `${n(h.filter(e => e.self).length)} ${n(h.length)}`);
  } },
  social:   { label: "社交", icon: "👫", render: day => stat(t("社交"), n(ofType(day, "social").length)) },
  sleep:    { label: "睡眠", icon: "🌙", render: () => stat(t("睡眠"), `${Math.round(sleepMsIn(Date.now() - D, Date.now()) / H * 10) / 10}<small>${t("小时")}</small>`) }
};
function statsHTML(day){
  return activeCards("stats").filter(k => k !== "hero").map(k => STATS[k].render(day)).join("");
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
// the checkpoint to show now: the first one at or after the child's age, else the last; none once past school entry (CDC stops at 5)
function milestoneRef(){
  const m = ageMonths(); if (m == null || m > 72) return null;
  return MILESTONE_REF.find(r => r.m >= m) || MILESTONE_REF[MILESTONE_REF.length - 1];
}
// suggestions for the free-text milestone field, in the interface language
const milestoneNames = () => MILESTONE_REF.flatMap(r => r.items.map(i => t(i[1])));
function milestoneRefHTML(){
  const ref = milestoneRef(); if (!ref) return "";
  const done = new Set(vis().filter(e => e.type === "milestone").map(e => (e.name || "").trim()));
  const label = ref.m < 24 ? t("{m} 个月", { m: ref.m }) : ref.m % 12 ? t("{y} 岁半", { y: Math.floor(ref.m / 12) }) : t("{y} 岁", { y: ref.m / 12 });
  // a milestone is "done" whether it was saved from this chip in any language or typed in
  const isDone = name => done.has(name) || done.has(t(name));
  return `<h3 class="small muted" style="margin-top:12px">${t("{age}左右常见的里程碑 · 点一下记录", { age: label })}</h3>
  <div class="ms">${ref.items.map(([cat, name]) => `<button class="chip ${isDone(name) ? "done" : ""}" data-add="milestone" data-preset="${esc(JSON.stringify({ cat, name: t(name) }))}"><span class="cat">${t(cat)}</span>${esc(t(name))}${isDone(name) ? " ✓" : ""}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:8px">${t("整理自美国 CDC「Learn the Signs. Act Early.」（2022 版，大多数孩子在该月龄能做到的事）。个体差异很大，不是诊断标准；担心时和儿科医生聊。")}</p>`;
}

/* ---- when to call the doctor, by stage ---- */
const DOCTOR_NEWBORN = [
  "<b>3 个月以内</b>体温 ≥ 38℃（100.4℉）：立即联系医生或去急诊，不要先自行用退烧药。",
  "呼吸急促、费力，嘴唇发青，或很难叫醒、异常软。",
  "湿尿布明显变少（出生第 5 天后 24 小时少于 6 次），嘴唇干、哭时无泪。",
  "皮肤或眼白越来越黄，尤其蔓延到腹部和腿，或出生 24 小时内就发黄。",
  "大便灰白色、带血，或持续喷射性呕吐、呕吐物呈绿色。",
  "连续几次拒奶，或体重没有按医生预期回升。",
  "脐带周围红肿、有臭味或流脓。"
];
const DOCTOR_OLDER = [
  "发热伴精神差、持续 2–3 天不退，或体温 ≥ 40℃（104℉）。",
  "呼吸急促、费力，嘴唇发青，或很难叫醒。",
  "脱水：尿明显变少、嘴唇干、哭时无泪、异常没精神。",
  "持续呕吐或腹泻，大便带血，或剧烈腹痛。",
  "抽搐、颈部僵硬、发热伴按压不褪色的皮疹。",
  "头部摔伤后呕吐、嗜睡或行为异常。",
  "吃了新食物后嘴唇面部肿胀、呼吸困难、全身荨麻疹：立即就医。"
];
function doctorListHTML(){
  const list = stageOf().key === "newborn" ? DOCTOR_NEWBORN : DOCTOR_OLDER;
  return `<ul class="plain">${list.map(s => `<li>${t(s)}</li>`).join("")}</ul>`;
}

export { STAGE, stageCfg, stageTypes, stageMetrics, activeCards, setCard, resetCards, hasCardPrefs, allCards, quickHTML, statsHTML, MILESTONE_REF, milestoneRef, milestoneNames, milestoneRefHTML, doctorListHTML };
