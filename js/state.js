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
function normalizeSettings(){
  const st = S.settings;
  st.children = (Array.isArray(st.children) ? st.children : []).filter(c => c && typeof c.id === "string").map(c => ({ id: c.id, name: c.name || "", birth: c.birth || "" }));
  if (!st.children.length) { const id = newId(); st.children.push({ id, name: st.babyName || "", birth: st.birth || "" }); st.legacyChild = id; }
  if (!st.legacyChild || !st.children.some(c => c.id === st.legacyChild)) st.legacyChild = st.children[0].id;
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
  // keep the single-child fields mirrored to the first child for older exports / clients
  st.babyName = st.children[0].name; st.birth = st.children[0].birth;
  let cid = S.childId; if (cid == null) { try { cid = localStorage.getItem(CHILD_KEY); } catch (e) {} }
  S.childId = st.children.some(c => c.id === cid) ? cid : st.children[0].id;
}
const child = (id = S.childId) => S.settings.children.find(c => c.id === id) || S.settings.children[0];
const childName = (id = S.childId) => (child(id) && child(id).name) || t("宝宝");
// unknown ids (e.g. a child removed on another device) fall back to the legacy child so no record disappears
function childOf(e){ return e.child && S.settings.children.some(c => c.id === e.child) ? e.child : S.settings.legacyChild; }
function setChild(id){ if (!S.settings.children.some(c => c.id === id)) return; S.childId = id; try { localStorage.setItem(CHILD_KEY, id); } catch (e) {} }
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

const APP_VERSION = "2026-10-18.2";

export { LS_KEY, S, loadLocal, CHILD_KEY, MOM_TYPES, isKidType, normalizeSettings, child, childName, childOf, setChild, vis, kidCount, saveLocal, birthTs, babyAgeDays, ageText, STAGES, stageOf, ageMonths, ageAtText, CHECKUPS, checkupDate, checkupDefaultDate, checkupOverride, checkupsDone, matchCheckup, nextCheckup, APP_VERSION };
