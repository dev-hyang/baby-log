import { $, D, newId, startOfDay } from "./util.js";

/* ============ state & storage ============ */
const LS_KEY = "xiaoyueliang.v1";
const S = {
  entries: [],
  settings: { babyName: "", birth: "", children: [], legacyChild: null, medIntervals: [{ name: "布洛芬", hours: "" }, { name: "泰诺", hours: "" }], checkups: {} },
  childId: null, // which child this device is looking at
  mode: "local", col: null, prof: null, sample: null,
  tab: "today", filter: "all", q: "",
  logView: "meal", mealDay: null, gran: "day", metric: "sleep",
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
  // keep the single-child fields mirrored to the first child for older exports / clients
  st.babyName = st.children[0].name; st.birth = st.children[0].birth;
  let cid = S.childId; if (cid == null) { try { cid = localStorage.getItem(CHILD_KEY); } catch (e) {} }
  S.childId = st.children.some(c => c.id === cid) ? cid : st.children[0].id;
}
const child = (id = S.childId) => S.settings.children.find(c => c.id === id) || S.settings.children[0];
const childName = (id = S.childId) => (child(id) && child(id).name) || "宝宝";
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
  const d = babyAgeDays(Date.now(), cid); if (d == null) return "先在设置里填宝宝生日";
  if (d < 0) return `距预产期还有 ${-d} 天`;
  const b = new Date(birthTs(cid)), n = new Date();
  let m = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth(); if (n.getDate() < b.getDate()) m--;
  const stage = STAGES.find(s => d < s.untilDays) || STAGES[STAGES.length - 1];
  const age = d < 60 ? `出生第 ${d + 1} 天` : m < 24 ? `${m} 个月` : `${Math.floor(m / 12)} 岁 ${m % 12} 个月`;
  return `${age} · ${stage.name}`;
}
const STAGES = [
  { name: "新生儿期", range: "0–3 个月", untilDays: 91, items: ["喂奶 / 尿布 / 睡眠", "妈妈产后恢复", "黄疸与体重"] },
  { name: "婴儿期", range: "3–12 个月", untilDays: 366, items: ["作息与睡眠引导", "辅食记录（约6月起）", "大运动里程碑"] },
  { name: "幼儿期", range: "1–3 岁", untilDays: 1096, items: ["语言发展", "饮食与过敏", "如厕训练"] },
  { name: "学前期", range: "3–5 岁 PreK", untilDays: 1e9, items: ["入园准备", "社交与情绪", "阅读与早期学习"] }
];
// AAP Bright Futures well-child visit schedule
const CHECKUPS = [
  { k: "d4", label: "出生后 3–5 天", days: 4 }, { k: "m1", label: "1 月龄", m: 1 }, { k: "m2", label: "2 月龄", m: 2 },
  { k: "m4", label: "4 月龄", m: 4 }, { k: "m6", label: "6 月龄", m: 6 }, { k: "m9", label: "9 月龄", m: 9 },
  { k: "m12", label: "12 月龄", m: 12 }, { k: "m15", label: "15 月龄", m: 15 }, { k: "m18", label: "18 月龄", m: 18 },
  { k: "m24", label: "2 岁", m: 24 }, { k: "m30", label: "2 岁半", m: 30 }, { k: "y3", label: "3 岁", m: 36 },
  { k: "y4", label: "4 岁", m: 48 }, { k: "y5", label: "5 岁", m: 60 }
];
function checkupDate(c){ const b = birthTs(); if (b == null) return null; if (c.days) return b + c.days * D; const d = new Date(b); d.setMonth(d.getMonth() + c.m); return d.getTime(); }
const checkupsDone = () => (S.settings.checkups || {})[S.childId] || {};
function nextCheckup(){ const done = checkupsDone(); return CHECKUPS.map(c => ({ ...c, at: checkupDate(c) })).find(c => c.at && !done[c.k] && c.at > Date.now() - 14 * D); }

const APP_VERSION = "2026-10-15.3";

export { LS_KEY, S, loadLocal, CHILD_KEY, MOM_TYPES, isKidType, normalizeSettings, child, childName, childOf, setChild, vis, kidCount, saveLocal, birthTs, babyAgeDays, ageText, STAGES, CHECKUPS, checkupDate, checkupsDone, nextCheckup, APP_VERSION };
