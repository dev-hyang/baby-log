import { S, vis } from "./state.js";
import { trim } from "./units.js";
import { D, H, num } from "./util.js";

/* ============ derived data ============ */
const byTime = (a, b) => b.ts - a.ts;
const last = (pred) => vis().filter(pred).sort(byTime)[0];
const within = (ms) => vis().filter(e => e.ts >= Date.now() - ms && e.ts <= Date.now() + 60e3);

function suggestSide(f){
  if (!f || !["亲喂", "混合"].includes(f.method)) return null;
  const l = +f.left || 0, r = +f.right || 0;
  if (!l && !r) return null;
  if (l && !r) return "右侧"; if (r && !l) return "左侧";
  return l < r ? "左侧" : "右侧";
}
function expectedDiapers(dayIdx){ // common lactation guidance for the first week
  if (dayIdx == null || dayIdx > 30) return { wet: 6, poop: null };
  const d = dayIdx + 1;
  if (d <= 5) return { wet: d, poop: Math.min(d, 3) };
  return { wet: 6, poop: 3 };
}
function sleepMsIn(fromTs, toTs){
  let t = 0;
  for (const e of vis()) if (e.type === "sleep") {
    const s = e.ts, en = e.end || Date.now();
    const a = Math.max(s, fromTs), b = Math.min(en, toTs); if (b > a) t += b - a;
  }
  return t;
}
function medStatus(){
  const out = [];
  const meds = S.entries.filter(e => e.type === "mmed" && e.ts > Date.now() - 2 * D).sort(byTime);
  const seen = new Set();
  for (const m of meds) {
    const name = (m.name || m.cat || "").trim(); if (!name || seen.has(name)) continue; seen.add(name);
    const rule = (S.settings.medIntervals || []).find(r => r.name && name.includes(r.name) && num(r.hours));
    const next = rule ? m.ts + num(rule.hours) * H : null;
    out.push({ name, at: m.ts, next, count24: meds.filter(x => (x.name || x.cat || "").trim() === name && x.ts > Date.now() - D).length });
  }
  return out;
}

export { byTime, last, within, suggestSide, expectedDiapers, sleepMsIn, medStatus };
