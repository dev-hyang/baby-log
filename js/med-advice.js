/* ============ 妈妈用药：服药时机（空腹 / 饭前 / 饭后 …）和下次可服时间 ============
   只显示用户自己按医嘱 / 说明书填的内容，不替医生下结论。纯函数，不碰页面（测试见 tests/med-advice.test.mjs）。
   规则（设置里每种药一条）：{ name, hours（最短间隔）, timing（服药时机）, mins（饭前 / 饭后多少分钟）, note（医嘱备注） }
   一条服药记录里也可以单独填 timing / mins，填了就以记录为准。 */

const TIMINGS = ["不限", "空腹", "饭前", "饭后", "随餐", "睡前"];
const NEEDS_MINS = new Set(["饭前", "饭后"]);
const H = 3600e3;
const num = v => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : 0; };

/** 设置里能对上这个药名的那条规则（药名包含规则里的名字即可） */
const ruleFor = (rules, name) => (rules || []).find(r => r && r.name && String(name || "").includes(r.name)) || null;

/** 这次服药适用的时机：记录自己填了就用记录的，否则用规则的；都没有就是 null */
function timingOf(entry, rule){
  const pick = o => o && o.timing && o.timing !== "不限" ? { timing: o.timing, mins: NEEDS_MINS.has(o.timing) ? num(o.mins) : 0 } : null;
  return pick(entry) || pick(rule);
}

/** 一句话：空腹 / 饭前 30 分钟 / 饭后 30 分钟 / 随餐 / 睡前；没有时机返回空字符串 */
function timingText(tm, t){
  if (!tm) return "";
  if (NEEDS_MINS.has(tm.timing) && tm.mins) return t(tm.timing === "饭前" ? "饭前 {n} 分钟" : "饭后 {n} 分钟", { n: tm.mins });
  return t(tm.timing);
}

/** 下次可以再服的时间（毫秒）；规则里没填最短间隔就是 null */
const nextDoseAt = (lastTs, rule) => rule && num(rule.hours) ? lastTs + num(rule.hours) * H : null;

/** 一种药的状态：上次、下次可服、24 小时内几次、服药时机、医嘱备注 */
function medInfo({ name, entry, rules, count24 }){
  const rule = ruleFor(rules, name);
  return { name, at: entry.ts, next: nextDoseAt(entry.ts, rule), count24, tm: timingOf(entry, rule), note: (rule && rule.note) || "" };
}

export { TIMINGS, NEEDS_MINS, ruleFor, timingOf, timingText, nextDoseAt, medInfo };
