import { t } from "./i18n.js";
import { $, D, newId, startOfDay } from "./util.js";

/* ============ state & storage ============ */
const LS_KEY = "xiaoyueliang.v1";
const S = {
  entries: [],
  settings: { babyName: "", birth: "", children: [], legacyChild: null, medIntervals: [{ name: t("布洛芬"), hours: "" }, { name: t("泰诺"), hours: "" }], checkups: {}, checkupDates: {} },
  childId: null, // which child this device is looking at
  mode: "local", col: null, prof: null, sample: null,
  tab: "today", filter: "all", q: "",
  logView: "meal", mealDay: null, gran: "day", metric: "sleep", checkupView: "plan",
  flashId: null, // the entry just saved on Today, highlighted for a moment
  logFocus: false // re-focus the search box after the log view re-renders on typing
};
function loadLocal(){
  try { const o = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (o) { S.entries = Array.isArray(o.entries) ? o.entries : []; S.settings = { ...S.settings, ...(o.settings || {}) }; }
  } catch (e) { /* storage may be unavailable; start empty */ }
  normalizeSettings();
}

/* ============ children ============
   Each child-scoped entry carries `child` (a child id). Entries written before multi-child support have
   no `child`; they belong to `settings.legacyChild`, so upgrading never rewrites or re-uploads old rows.
   Mother records (mmed, mbody) are family-level and never filtered by child. */
const CHILD_KEY = LS_KEY + ".child";
const MOM_TYPES = new Set(["mmed", "mbody"]);
const isKidType = t => !MOM_TYPES.has(t);
const HERO_KEYS = ["feed", "diaper", "potty", "meal", "companion", "outdoor", "wake", "routine"]; // see CLOCKS in stages.js
function normalizeSettings(){
  const st = S.settings;
  st.children = (Array.isArray(st.children) ? st.children : []).filter(c => c && typeof c.id === "string").map(c => ({ id: c.id, name: c.name || "", birth: c.birth || "", ...(c.archived ? { archived: true } : {}) }));
  if (!st.children.length) { const id = newId(); st.children.push({ id, name: st.babyName || "", birth: st.birth || "" }); st.legacyChild = id; }
  if (!st.legacyChild || !st.children.some(c => c.id === st.legacyChild)) st.legacyChild = st.children[0].id;
  // archived children keep their id and records but leave every picker; at least one child must stay active
  if (st.children.every(c => c.archived)) delete st.children[0].archived;
  const live = st.children.filter(c => !c.archived);
  // checkups used to be a flat { m1: true } map; now keyed by child id
  const flat = {}, nested = {};
  for (const [k, v] of Object.entries(st.checkups || {})) (typeof v === "boolean" ? flat : nested)[k] = v;
  st.checkups = nested;
  if (Object.keys(flat).length) st.checkups[st.legacyChild] = { ...flat, ...(nested[st.legacyChild] || {}) };
  // checkupDates: { childId: { m2: "2026-03-14" } } — the clinic's actual appointment when it differs from the schedule
  if (!st.checkupDates || typeof st.checkupDates !== "object") st.checkupDates = {};
  // cardPrefs: { childId: { quick: { on: [], off: [] }, stats: { on: [], off: [] } } } — per-child changes to the stage's default cards
  const strs = a => Array.isArray(a) ? a.filter(x => typeof x === "string") : [], prefs = {};
  for (const c of st.children) {
    const p = (st.cardPrefs || {})[c.id]; if (!p || typeof p !== "object") continue;
    const kind = k => ({ on: strs(p[k] && p[k].on), off: strs(p[k] && p[k].off) });
    prefs[c.id] = { quick: kind("quick"), stats: kind("stats") };
  }
  st.cardPrefs = prefs;
  // faith: opt-in module, off by default. statement is the family's own words (everyone in the family sees it);
  // off lists the children it is switched off for.
  const fa = st.faith && typeof st.faith === "object" ? st.faith : {};
  st.faith = { on: !!fa.on, statement: typeof fa.statement === "string" ? fa.statement.slice(0, 400) : "", off: strs(fa.off).filter(id => st.children.some(c => c.id === id)) };
  // per-child Today choices for toddlers / preschoolers: routine = the child's own step list ([] hides it),
  // heroPref = what the big clock counts, pottyMin = minutes between potty reminders
  const own = {}, hp = {}, pm = {}, cu = {};
  for (const c of st.children) {
    const r = cleanRoutine((st.routine || {})[c.id]); if (r) own[c.id] = r;
    // heroCustom[child] = [{ id: "u_…", name, type, kind }]: the child's own "since last" cards; heroPref[child] = the cards in order
    const cl = (Array.isArray((st.heroCustom || {})[c.id]) ? st.heroCustom[c.id] : []).filter(x => x && /^u_\w+$/.test(x.id) && typeof x.type === "string").slice(0, 8)
      .map(x => ({ id: x.id, name: String(x.name || "").trim().slice(0, 30), type: x.type, kind: String(x.kind || "").slice(0, 16) }));
    if (cl.length) cu[c.id] = cl;
    const h = [].concat((st.heroPref || {})[c.id] || []).filter((k, i, a) => (HERO_KEYS.includes(k) || cl.some(x => x.id === k)) && a.indexOf(k) === i); if (h.length) hp[c.id] = h;
    const m = Math.round(+(st.pottyMin || {})[c.id]); if (m >= 15 && m <= 480) pm[c.id] = m;
  }
  st.routine = own; st.heroPref = hp; st.heroCustom = cu; st.pottyMin = pm;
  // keep the single-child fields mirrored to the first child for older exports / clients
  st.babyName = live[0].name; st.birth = live[0].birth;
  let cid = S.childId; if (cid == null) { try { cid = localStorage.getItem(CHILD_KEY); } catch (e) {} }
  S.childId = live.some(c => c.id === cid) ? cid : live[0].id;
}
const activeKids = () => S.settings.children.filter(c => !c.archived);
const child = (id = S.childId) => S.settings.children.find(c => c.id === id) || S.settings.children[0];
const childName = (id = S.childId) => (child(id) && child(id).name) || t("宝宝");
// unknown ids (e.g. a child removed on another device) fall back to the legacy child so no record disappears
function childOf(e){ return e.child && S.settings.children.some(c => c.id === e.child) ? e.child : S.settings.legacyChild; }
function setChild(id){ if (!activeKids().some(c => c.id === id)) return; S.childId = id; try { localStorage.setItem(CHILD_KEY, id); } catch (e) {} }
// entries shown on this device: the active child's records plus family-level mother records
const vis = () => S.entries.filter(e => !isKidType(e.type) || childOf(e) === S.childId);
function kidCount(id){ return S.entries.filter(e => isKidType(e.type) && childOf(e) === id).length; }
function saveLocal(){ try { localStorage.setItem(LS_KEY, JSON.stringify({ entries: S.entries, settings: S.settings })); } catch (e) {} }
/* ============ baby age & stages ============ */
function birthTs(cid = S.childId){ const c = child(cid); return c && c.birth ? new Date(c.birth + "T00:00:00").getTime() : null; }
function babyAgeDays(at = Date.now(), cid = S.childId){ const b = birthTs(cid); return b == null ? null : Math.floor((startOfDay(at) - b) / D); }
function ageText(cid = S.childId){
  const d = babyAgeDays(Date.now(), cid); if (d == null) return t("先在设置里填宝宝生日");
  if (d < 0) return t("距预产期还有 {n} 天", { n: -d });
  const b = new Date(birthTs(cid)), n = new Date();
  let m = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth(); if (n.getDate() < b.getDate()) m--;
  const stage = STAGES.find(s => d < s.untilDays) || STAGES[STAGES.length - 1];
  const age = d < 60 ? t("出生第 {n} 天", { n: d + 1 }) : m < 24 ? t("{m} 个月", { m }) : t("{y} 岁 {m} 个月", { y: Math.floor(m / 12), m: m % 12 });
  return `${age} · ${t(stage.name)}`;
}
const STAGES = [
  { key: "newborn", name: "新生儿期", range: "0–3 个月", untilDays: 91, items: ["喂奶 / 尿布 / 睡眠", "妈妈产后恢复", "黄疸与体重"] },
  { key: "infant", name: "婴儿期", range: "3–12 个月", untilDays: 366, items: ["辅食与过敏反应", "作息与睡眠", "发育里程碑"] },
  { key: "toddler", name: "幼儿期", range: "1–3 岁", untilDays: 1096, items: ["三餐与喝奶", "如厕训练", "语言与情绪"] },
  { key: "preschool", name: "学前期", range: "3–5 岁 PreK", untilDays: 2192, items: ["阅读与户外", "幼儿园与社交", "情绪行为"] },
  { key: "school", name: "学龄期", range: "6–11 岁", untilDays: 4384, items: ["陪伴与谈心", "习惯与自律", "情绪与社交"] },
  { key: "teen", name: "青少年期", range: "12 岁以上", untilDays: 1e9, items: ["情绪与心事", "自律与节制", "陪伴与关系"] }
];
// The stage decides which quick buttons, stats, trend metrics and references the pages show.
// Without a birth date the app behaves as it always did: newborn.
function stageOf(cid = S.childId){ const d = babyAgeDays(Date.now(), cid); return d == null ? STAGES[0] : STAGES.find(s => d < s.untilDays) || STAGES[STAGES.length - 1]; }
function ageMonths(cid = S.childId, at = Date.now()){ const b = birthTs(cid); if (b == null) return null; const bd = new Date(b), n = new Date(at); let m = (n.getFullYear() - bd.getFullYear()) * 12 + n.getMonth() - bd.getMonth(); if (n.getDate() < bd.getDate()) m--; return Math.max(0, m); }
// "26天" / "8月龄" / "2岁3月" for a record's timestamp
function ageAtText(ts, cid = S.childId){
  const d = babyAgeDays(ts, cid); if (d == null || d < 0) return "";
  if (d < 60) return t("{n}天", { n: d + 1 });
  const m = ageMonths(cid, ts);
  return m < 24 ? t("{m}月龄", { m }) : m % 12 ? t("{y}岁{m}月", { y: Math.floor(m / 12), m: m % 12 }) : t("{y}岁", { y: Math.floor(m / 12) });
}
// AAP Bright Futures well-child visit schedule
const CHECKUPS = [
  { k: "d4", label: "出生后 3–5 天", days: 4 }, { k: "m1", label: "1 月龄", m: 1 }, { k: "m2", label: "2 月龄", m: 2 },
  { k: "m4", label: "4 月龄", m: 4 }, { k: "m6", label: "6 月龄", m: 6 }, { k: "m9", label: "9 月龄", m: 9 },
  { k: "m12", label: "12 月龄", m: 12 }, { k: "m15", label: "15 月龄", m: 15 }, { k: "m18", label: "18 月龄", m: 18 },
  { k: "m24", label: "2 岁", m: 24 }, { k: "m30", label: "2 岁半", m: 30 }, { k: "y3", label: "3 岁", m: 36 },
  { k: "y4", label: "4 岁", m: 48 }, { k: "y5", label: "5 岁", m: 60 }
];
// the date the schedule suggests, from the birth date
function checkupDefaultDate(c, cid = S.childId){ const b = birthTs(cid); if (b == null) return null; if (c.days) return b + c.days * D; const d = new Date(b); d.setMonth(d.getMonth() + c.m); return d.getTime(); }
// the date the reminder uses: the clinic's actual appointment if the parent changed it, else the schedule
const checkupOverride = (c, cid = S.childId) => ((S.settings.checkupDates || {})[cid] || {})[c.k] || null;
function checkupDate(c, cid = S.childId){
  const o = checkupOverride(c, cid);
  if (o) { const ts = new Date(o + "T00:00:00").getTime(); if (!isNaN(ts)) return ts; }
  return checkupDefaultDate(c, cid);
}
const checkupsDone = (cid = S.childId) => (S.settings.checkups || {})[cid] || {};
// the scheduled visit a clinic record most plausibly belongs to: the closest one within three weeks
function matchCheckup(ts, cid = S.childId){
  let best = null;
  for (const c of CHECKUPS) { const at = checkupDate(c, cid); if (at == null) continue; const d = Math.abs(at - ts); if (d <= 21 * D && (!best || d < best.d)) best = { c, d }; }
  return best && best.c;
}
function nextCheckup(){ const done = checkupsDone(); return CHECKUPS.map(c => ({ ...c, at: checkupDate(c) })).find(c => c.at && !done[c.k] && c.at > Date.now() - 14 * D); }

/* ---- faith module switch and the daily routine ----
   The routine is the ordered list of habit steps a parent ticks off each day (get up, toilet, brush teeth …).
   A child's own list (settings.routine) wins, [] hides it; otherwise toddlers to school-age use the default.
   The default's prayer step follows the faith module, like every other faith card. */
const faithOn = (cid = S.childId) => { const f = S.settings.faith; return !!f && f.on && !(f.off || []).includes(cid); };
const ROUTINE_DEFAULT = ["起床", "上厕所", "刷牙洗漱", "读经祷告", "吃早饭", "收拾饭桌", "读故事 / 户外"];
const ROUTINE_STAGES = ["toddler", "preschool", "school"];
// starting points a parent can add to the list and then edit; step names must be unique per child, so repeats are numbered
const ROUTINE_TPL = [
  { name: "晨间", steps: ROUTINE_DEFAULT },
  { name: "午间", steps: ["洗手", "吃午饭", "收拾饭桌 2", "午睡"] },
  { name: "晚间", steps: ["洗手", "吃晚饭", "收拾饭桌 3", "洗澡"] },
  { name: "睡前", steps: ["刷牙", "睡前故事", "摇篮曲", "睡前祷告", "晚安"] }
];
const FAITH_STEPS = ["读经祷告", "睡前祷告"];
// the groups to show: the child's own list ([] hides it), else a one-group default for toddlers to school-age
function routineGroups(cid = S.childId){
  const own = (S.settings.routine || {})[cid];
  if (Array.isArray(own)) return own;
  return ROUTINE_STAGES.includes(stageOf(cid).key) ? [{ name: "晨间", steps: ROUTINE_DEFAULT.filter(s => !FAITH_STEPS.includes(s) || faithOn(cid)) }] : [];
}
const routineSteps = cid => routineGroups(cid).flatMap(g => g.steps);
// settings.routine[child] = [{ name, steps }]; an older flat list of step names becomes one group, repeated names get a number
function cleanRoutine(r){
  if (!Array.isArray(r)) return null;
  const groups = r.every(x => typeof x === "string") ? (r.length ? [{ name: "晨间", steps: r }] : []) : r.filter(g => g && Array.isArray(g.steps)), seen = new Set();
  return groups.slice(0, 8).map(g => ({ name: String(g.name || "").trim().slice(0, 16), steps: g.steps.filter(s => typeof s === "string").map(s => s.trim().slice(0, 24)).filter(Boolean).slice(0, 20).map(s => { let n = s, i = 2; while (seen.has(n)) n = s + " " + i++; seen.add(n); return n; }) })).filter(g => g.steps.length);
}
// the editor's text: "# group name" lines, then one step per line
const routineToText = gs => gs.map(g => (g.name ? "# " + g.name + "\n" : "") + g.steps.join("\n")).join("\n\n");
function textToRoutine(txt){
  const gs = []; let g = null;
  for (const raw of txt.split("\n")) {
    const l = raw.trim(); if (!l) continue;
    if (l[0] === "#") { g = { name: l.replace(/^#+\s*/, ""), steps: [] }; gs.push(g); }
    else { if (!g) { g = { name: "", steps: [] }; gs.push(g); } g.steps.push(l); }
  }
  return gs;
}

const APP_VERSION = "2026-10-24.1";

export { faithOn, FAITH_STEPS, ROUTINE_TPL, routineGroups, routineSteps, routineToText, textToRoutine, LS_KEY, S, activeKids, loadLocal, CHILD_KEY, MOM_TYPES, isKidType, normalizeSettings, child, childName, childOf, setChild, vis, kidCount, saveLocal, birthTs, babyAgeDays, ageText, STAGES, stageOf, ageMonths, ageAtText, CHECKUPS, checkupDate, checkupDefaultDate, checkupOverride, checkupsDone, matchCheckup, nextCheckup, APP_VERSION };
