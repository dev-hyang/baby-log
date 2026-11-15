/* ============ 睡眠卡：要不要叫醒（小月亮和家庭学堂同一份，改了两边一起改） ============
   纯函数，不读页面状态。只是参考，按常见的儿科睡眠建议粗分：
   · 新生儿（未满 1 个月）：白天 3 小时、夜里 4 小时没吃奶就叫醒喂一次（体重回到出生体重、医生说可以以后，夜里可以让他睡）。
   · 夜里的觉：不叫醒；早上 6 点以后、已经睡够这个年龄夜里该睡的时长，提示可以叫醒（作息更稳）。
   · 白天小睡：一觉不宜太长（4 个月内 2.5 小时、4–12 个月 2 小时、1–3 岁 2.5 小时、3 岁以上 1.5 小时），
     也不宜睡得太晚（4–12 个月 17:00、1–3 岁 16:00、3 岁以上 15:30 以后会推迟晚上入睡）。
   返回 { level: "ok" | "soon" | "wake", text, at }：at = 建议叫醒的时间（有的话）。 */
const H = 3600e3, M = 60e3, SOON = 20 * M;

/** 这一觉是夜里还是小睡：nap 记过就听记录的；没记就看几点开始睡（18 点到凌晨 4 点开始的算夜里） */
export function isNight(start, nap){
  if (nap === true) return false;
  if (nap === false) return true;
  const h = new Date(start).getHours();
  return h >= 18 || h < 4;
}
/** 白天一觉建议最长多久（毫秒） */
export const napCap = (m) => (m == null ? 2 * H : m < 4 ? 2.5 * H : m < 12 ? 2 * H : m < 36 ? 2.5 * H : 1.5 * H);
/** 几点以后还在小睡就该叫醒（小时，小数）；4 个月内不管 */
export const napLate = (m) => (m == null || m < 4 ? null : m < 12 ? 17 : m < 36 ? 16 : 15.5);
/** 夜里大概该睡多久（毫秒）；4 个月内夜里本来就会醒来吃，不算 */
export const nightNeed = (m) => (m == null || m < 4 ? null : m < 72 ? 10 * H : m < 156 ? 9 * H : 8 * H);

const hm = (ts) => { const d = new Date(ts); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
const dur = (ms, t) => { const m = Math.max(0, Math.round(ms / M)), h = Math.floor(m / 60); return h ? (m % 60 ? t("{h} 小时 {m} 分", { h, m: m % 60 }) : t("{h} 小时", { h })) : t("{n} 分钟", { n: m }); };
const lateTs = (start, hour) => { const d = new Date(start); d.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0); return d.getTime(); };

/**
 * @param {{ start:number, now?:number, months:number|null, nap?:boolean, lastFeed?:number|null }} o
 * @param {(s:string, v?:object)=>string} t 翻译函数
 */
export function wakeAdvice({ start, now = Date.now(), months = null, nap, lastFeed = null }, t){
  const night = isNight(start, nap), slept = now - start;
  if (months != null && months < 1) {   // 新生儿：按上一次吃奶算
    const from = lastFeed && lastFeed <= now ? Math.max(lastFeed, start - 4 * H) : start, at = from + (night ? 4 : 3) * H;
    if (now >= at) return { level: "wake", at, text: t("新生儿已经 {d} 没吃奶了，建议叫醒喂一次", { d: dur(now - from, t) }) };
    return { level: now >= at - SOON ? "soon" : "ok", at, text: t("新生儿：最晚 {time} 叫醒喂奶", { time: hm(at) }) };
  }
  if (night) {
    const need = nightNeed(months), h = new Date(now).getHours();
    if (need && slept >= need && h >= 6 && h < 12) return { level: "soon", at: start + need, text: t("已经睡够 {d}，早上可以叫醒，作息更稳", { d: dur(slept, t) }) };
    return { level: "ok", at: null, text: t("夜里的觉，不用叫醒") };
  }
  const cap = napCap(months), late = napLate(months);
  let at = start + cap, why = "long";
  if (late != null) { const lt = lateTs(start, late); if (lt < at) { at = Math.max(lt, start + 20 * M); why = "late"; } }
  if (now >= at) return { level: "wake", at, text: why === "late" ? t("快傍晚了，再睡会推迟晚上入睡，可以叫醒了") : t("白天一觉建议不超过 {d}，可以叫醒了", { d: dur(cap, t) }) };
  return { level: now >= at - SOON ? "soon" : "ok", at, text: t("小睡：建议 {time} 前叫醒", { time: hm(at) }) };
}
