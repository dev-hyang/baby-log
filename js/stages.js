import { expectedDiapers, last, sleepMsIn } from "./derived.js";
import { t } from "./i18n.js";
import { S, ageMonths, babyAgeDays, birthTs, faithOn, groupTone, routineGroups, routineSteps, stageOf, vis } from "./state.js";
import { TYPES } from "./types.js";
import { isUS, toDisp, trim, unitOf } from "./units.js";
import { D, H, dur, esc, hm, startOfDay } from "./util.js";

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
  prayer:  { add: "faith", preset: { kind: "祷告" }, icon: "🙏", label: "祷告" },
  worship: { add: "faith", preset: { kind: "家庭敬拜" }, icon: "🎶", label: "家庭敬拜" },
  scripture: { add: "faith", preset: { kind: "读经" }, icon: "📖", label: "读经" },
  serve:   { add: "faith", preset: { kind: "服事" }, icon: "🤲", label: "服事" },
  companion: { add: "companion", icon: "🤗", label: "陪伴" },
  mood:    { add: "mood", icon: "🌤", label: "情绪" },
  habit:   { add: "habit", icon: "🎯", label: "自律" },
  social:  { add: "social", icon: "👫", label: "社交" }
};
// heroes: the cards on top of Today, swipeable — each counts since the last record of something (see CLOCKS), or shows
// the routine's progress; each child can change the list (see heroKeys)
const STAGE = {
  newborn:   { heroes: ["feed", "diaper", "wake"],
               quick: ["nurse", "bottle", "formula", "diaper", "sleep", "mmed", "mbody", "health"],
               stats: ["hero", "feeds", "bottle", "nursing", "wetpoop", "sleep"],
               types: ["feed", "diaper", "sleep", "baby", "bmed", "vax"],
               metrics: ["sleep", "longest", "ml", "nurse", "feeds", "wet", "poop", "pump"] },
  infant:    { heroes: ["feed", "diaper", "meal", "wake"],
               quick: ["nurse", "bottle", "formula", "solids", "diaper", "sleep", "milestone", "health"],
               stats: ["hero", "feeds", "bottle", "solids", "wetpoop", "sleep"],
               types: ["feed", "food", "diaper", "sleep", "milestone", "baby", "bmed", "vax"],
               metrics: ["sleep", "longest", "ml", "nurse", "feeds", "food", "wet", "poop"] },
  toddler:   { heroes: ["potty", "meal", "routine", "wake"],
               quick: ["meal", "milk", "potty", "diaper", "sleep", "speech", "activity", "health", "prayer", "scripture"],
               stats: ["hero", "meals", "mealq", "milk", "potty", "diapers", "outdoorRead", "sleep"],
               types: ["food", "feed", "potty", "routine", "diaper", "sleep", "speech", "activity", "milestone", "behavior", "baby", "bmed", "vax", "faith"],
               metrics: ["sleep", "longest", "food", "mealMin", "routine", "ml", "potty", "outdoor", "read", "words", "tantrum"] },
  preschool: { heroes: ["routine", "meal", "potty", "outdoor"],
               quick: ["meal", "read", "outdoor", "school", "behavior", "potty", "sleep", "health", "prayer", "scripture"],
               stats: ["hero", "meals", "mealq", "read", "outdoor", "screen", "upset", "sleep", "faith"],
               types: ["food", "routine", "activity", "behavior", "potty", "sleep", "speech", "milestone", "baby", "bmed", "vax", "feed", "diaper", "faith"],
               metrics: ["sleep", "routine", "read", "outdoor", "screen", "food", "mealMin", "tantrum", "words", "potty", "faith"] },
  school:    { heroes: ["companion", "routine", "outdoor"],
               quick: ["companion", "mood", "habit", "social", "read", "outdoor", "screen", "health", "worship", "prayer", "scripture", "serve"],
               stats: ["hero", "companion", "mood", "habit", "social", "screen", "sleep", "faith"],
               types: ["companion", "mood", "habit", "routine", "social", "activity", "food", "sleep", "milestone", "baby", "bmed", "vax", "behavior", "speech", "faith"],
               metrics: ["companion", "mood", "habit", "routine", "social", "read", "outdoor", "screen", "sleep", "faith"] },
  teen:      { heroes: ["companion", "outdoor", "routine"],
               quick: ["companion", "mood", "habit", "social", "screen", "read", "outdoor", "health", "prayer", "scripture", "serve"],
               stats: ["hero", "companion", "mood", "habit", "social", "screen", "outdoor", "faith"],
               types: ["companion", "mood", "habit", "social", "activity", "sleep", "baby", "bmed", "vax", "milestone", "food", "faith"],
               metrics: ["companion", "mood", "habit", "social", "screen", "sleep", "outdoor", "read", "faith"] }
};
/* ---- faith module: opt-in, family-level (settings.faith), switchable per child ----
   Everything faith-related is simply absent while it is off: its quick cards, stat, trend metric, record type in
   the 补记 picker. Records already written stay in the log and the timeline either way. */
const FAITH_KEYS = { quick: ["prayer", "worship", "scripture", "serve"], stats: ["faith"], metrics: ["faith"], types: ["faith"] };
const withoutFaith = (kind, keys, cid) => faithOn(cid) ? keys : keys.filter(k => !FAITH_KEYS[kind].includes(k));
const stageCfg = () => STAGE[stageOf().key];
const stageTypes = () => withoutFaith("types", stageCfg().types);
const stageMetrics = () => withoutFaith("metrics", stageCfg().metrics);

/* ---- toddler / preschool Today: what the clock counts, potty reminders, the daily routine ---- */
const POTTY_DEFAULT_MIN = 90;
// the "since last" cards the top of Today can show (plus the routine's progress, which is not a clock).
// add / preset: the record button next to the status; act: a one-tap action instead; sum: the line after the time
const CLOCKS = {
  feed:      { label: "距上次喂奶", noun: "喂奶", empty: "点下面的按钮记录第一次喂奶", add: "feed", find: () => last(e => e.type === "feed" && e.method !== "吸奶") },
  diaper:    { label: "距上次换尿布", noun: "换尿布", empty: "点下面的按钮记录第一次换尿布", add: "diaper", find: () => last(e => e.type === "diaper") },
  potty:     { label: "距上次如厕", noun: "如厕", empty: "点下面的按钮记录第一次如厕", add: "potty", find: () => last(e => e.type === "potty") },
  meal:      { label: "距上次吃饭", noun: "吃饭", empty: "点下面的按钮记录今天第一顿", add: "food", find: () => last(e => e.type === "food") },
  companion: { label: "距上次陪伴", noun: "陪伴", empty: "点下面的按钮记录一次陪伴", add: "companion", find: () => last(e => e.type === "companion") },
  outdoor:   { label: "距上次户外", noun: "户外", empty: "点下面的按钮记录一次户外", add: "activity", preset: { kind: "户外" }, find: () => last(e => e.type === "activity" && e.kind === "户外") },
  wake:      { label: "距上次睡醒", noun: "开始睡", empty: "还没有睡眠记录", act: "sleepnow",
               find: () => { const e = last(x => x.type === "sleep" && x.end); return e && { ...e, ts: e.end, slept: e.end - e.ts }; },
               sum: e => t("睡了 {d}", { d: dur(e.slept) }) }
};
const HERO_BUILTIN = [...Object.keys(CLOCKS), "routine"];
const heroCustom = (cid = S.childId) => (S.settings.heroCustom || {})[cid] || [];
// a built-in card, or the child's own (a record type, optionally one kind of it, e.g. activity → 户外)
function clockOf(k, cid = S.childId){
  if (CLOCKS[k]) return CLOCKS[k];
  const u = heroCustom(cid).find(x => x.id === k); if (!u || !TYPES[u.type]) return null;
  const what = u.kind ? t(u.kind) : t(TYPES[u.type].label);
  return { label: u.name || t("距上次{x}", { x: what }), noun: what, empty: "还没有记录", add: u.type, ...(u.kind ? { preset: { kind: u.kind } } : {}),
           find: () => last(e => e.type === u.type && (!u.kind || e.kind === u.kind)) };
}
const clockLabel = (k, cid) => k === "routine" ? "今天的习惯" : (clockOf(k, cid) || { label: "" }).label;
// what the top of Today shows, in order. The child's own list (settings.heroPref) wins, otherwise the stage's default;
// the routine only counts while it has steps.
function heroKeys(cid = S.childId){
  const pick = (S.settings.heroPref || {})[cid], keys = (pick && pick.length ? pick : STAGE[stageOf(cid).key].heroes).filter(k => k === "routine" ? routineSteps(cid).length : !!clockOf(k, cid));
  return keys.length ? keys : ["meal"];
}
const pottyMin = (cid = S.childId) => (S.settings.pottyMin || {})[cid] || POTTY_DEFAULT_MIN;
// step name → today's latest record of it, for the active child
function routineToday(){
  const from = startOfDay(Date.now()), done = new Map();
  for (const e of vis().filter(e => e.type === "routine" && e.ts >= from).sort((a, b) => a.ts - b.ts)) done.set(e.step, e);
  return done;
}
function routineHTML(){
  const steps = routineSteps(); if (!steps.length) return "";
  const done = routineToday(), n = steps.filter(s => done.has(s)).length;
  const chip = s => { const e = done.get(s); return e
    ? `<button class="chip done" data-edit="${esc(e.id)}" aria-label="${esc(t("{step} 已完成，点一下修改", { step: t(s) }))}">✓ ${esc(t(s))} <small>${hm(e.ts)}${e.self ? "" : " · " + t("提醒后")}</small></button>`
    : `<button class="chip" data-step="${esc(s)}">${esc(t(s))}</button>`; };
  return `<div class="panel routine"><div class="phead"><h2>${t("今天的习惯")} <span class="small muted num" style="font-weight:400">${n}/${steps.length}</span></h2>
    <button class="gear" data-tab="routinecfg" aria-label="${t("编辑习惯清单")}">⚙</button></div>
  ${routineGroups().map(g => `<div class="rgroup ${groupTone(g.name)}">${g.name ? `<div class="lab"><span class="rgtag">${esc(t(g.name))}</span> <span class="num">${g.steps.filter(s => done.has(s)).length}/${g.steps.length}</span></div>` : ""}<div class="ms">${g.steps.map(chip).join("")}</div></div>`).join("")}
  <p class="small muted" style="margin:8px 0 0">${t("做到一步点一下，默认记为自己做到的；要提醒了才做的，点已完成的那一步改。")}</p></div>`;
}

/* ---- cards: the stage's defaults, adjusted per child ----
   settings.cardPrefs[child][kind] = { on: [keys added from outside the stage], off: [stage keys hidden] }.
   Storing only the differences keeps a child who never touched the settings on the stage defaults. */
const REG = () => ({ quick: Q, stats: STATS });
const prefOf = (kind, cid) => ((S.settings.cardPrefs || {})[cid] || {})[kind] || { on: [], off: [] };
function activeCards(kind, cid = S.childId){
  const reg = REG()[kind], def = STAGE[stageOf(cid).key][kind], p = prefOf(kind, cid);
  return withoutFaith(kind, [...def.filter(k => !p.off.includes(k)), ...p.on.filter(k => !def.includes(k))].filter(k => reg[k]), cid);
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
  return { common: withoutFaith(kind, def, cid).map(row), other: withoutFaith(kind, Object.keys(reg).filter(k => !def.includes(k)), cid).map(row) };
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
  mealq:    { label: "用餐习惯", icon: "🍽", render: day => {
    const meals = ofType(day, "food").filter(f => ["早餐", "午餐", "晚餐", "加餐"].includes(f.meal));
    const mm = meals.map(f => +f.minutes).filter(x => x > 0), late = meals.filter(f => f.called && f.called !== "马上来").length;
    return stat(t("用餐 平均用时 / 饭前洗手"), `${mm.length ? min(Math.round(mm.reduce((a, b) => a + b, 0) / mm.length)) : "–"} ${n(meals.filter(f => f.washed).length)}`,
      late ? `<div class="ref">${t("{n} 餐叫了才来或催了几次", { n: late })}</div>` : "");
  } },
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
  faith:    { label: "敬拜 / 祷告", icon: "🕊", render: day => {
    const f = ofType(day, "faith");
    return stat(t("敬拜 / 祷告"), `${n(f.filter(e => e.kind === "家庭敬拜").length)} ${n(f.filter(e => e.kind === "祷告").length)}`);
  } },
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

export { STAGE, faithOn, CLOCKS, HERO_BUILTIN, clockOf, clockLabel, heroCustom, heroKeys, pottyMin, POTTY_DEFAULT_MIN, routineHTML, routineToday, stageCfg, stageTypes, stageMetrics, activeCards, setCard, resetCards, hasCardPrefs, allCards, quickHTML, statsHTML, MILESTONE_REF, milestoneRef, milestoneNames, milestoneRefHTML, doctorListHTML };
