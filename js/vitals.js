/* ============ 基本体征：体重、身高、头围、BMI、血压、心率（2026-11-14） ============
   每项一张可以展开 / 收起的卡：卡头 = 最近一次的数和是否在正常范围；里面是按真实日期排的走势线（刻度带年份、点上写百分位、
   背景浅色带 / 虚线 = 这个年龄的正常范围），线下面一行参考范围和出处，再下面是默认收起的数据表。
   另外给 AI 的一段摘要（每项最近几次、当时几岁、同龄参考范围），「问 AI」时附上。
   这个文件不 import 任何东西：小月亮 js/vitals.js 和家庭学堂 js/vitals.js 同一份（改了请同步）。
   翻译、单位换算、日期、孩子几个月大这些由调用方用 ctx 传进来：
   ctx = { t, val(dim, v) 显示用的数, unit(dim), day(ts) "2026/10/20", months(ts) 那天几个月大 | null, sex "m" | "f" | null, src(e) 来源 } */

const DAY = 864e5;
const H = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const has = (e, k) => e && e[k] != null && e[k] !== "";

/* ---- 正常范围（只作参考；是否正常以儿科医生判断为准） ---- */
/** 心率（清醒、安静时，次/分）：AHA PALS 2020。[起始月龄, 截止月龄（不含）, 下限, 上限] */
const HR = [[0, 3, 85, 205], [3, 24, 100, 190], [24, 120, 60, 140], [120, Infinity, 60, 100]];
/** 血压：AAP 2017 儿童高血压指南的简化筛查表（Flynn et al., Pediatrics 2017, Table 6）。
 *  低于这个数一般属正常；到了或超过不等于高血压，要医生按性别、身高百分位查完整的表。13 岁起 120/80。
 *  岁数 → [男孩高压, 男孩低压, 女孩高压, 女孩低压] */
const BP = { 1: [98, 52, 98, 54], 2: [100, 55, 101, 58], 3: [101, 58, 102, 60], 4: [102, 60, 103, 62], 5: [103, 63, 104, 64], 6: [105, 66, 105, 67],
  7: [106, 68, 106, 68], 8: [107, 69, 107, 69], 9: [107, 70, 108, 71], 10: [108, 72, 109, 72], 11: [110, 74, 111, 74], 12: [113, 75, 114, 75] };
function hrRange(m){ if (m == null) return null; const r = HR.find(([a, b]) => m >= a && m < b); return r ? { lo: r[2], hi: r[3] } : null; }
/** 这个月龄的血压筛查线 { sys, dia }；1 岁以下没有（不常规量） */
function bpLimit(m, sex){
  if (m == null || m < 12) return null;
  const y = Math.floor(m / 12); if (y >= 13) return { sys: 120, dia: 80 };
  const r = BP[y]; if (!r) return null;
  return sex === "m" ? { sys: r[0], dia: r[1] } : sex === "f" ? { sys: r[2], dia: r[3] } : { sys: Math.min(r[0], r[2]), dia: Math.min(r[1], r[3]) };   // 不知道性别：取低的那个，宁可多提醒
}
/** BMI 百分位（CDC，2 岁以上）：<5 偏瘦，5–84 健康体重，85–94 超重，≥95 肥胖 */
const bmiBand = p => (p == null ? null : p < 5 ? "偏瘦" : p < 85 ? "健康体重" : p < 95 ? "超重" : "肥胖");
/** 一个数在不在范围：返回 "低" | "高" | null（在范围里或没有范围） */
function flag(k, v, m, sex, e){
  if (v == null || v === "") v = null;
  if (k === "pulse") { const r = hrRange(m); return r && v != null ? (v < r.lo ? "低" : v > r.hi ? "高" : null) : null; }
  if (k === "bp_sys" || k === "bp_dia") { const r = bpLimit(m, sex); return r && v != null && v >= (k === "bp_sys" ? r.sys : r.dia) ? "高" : null; }
  if (k === "bmipct") return v == null ? null : v < 5 ? "低" : v >= 85 ? "高" : null;
  if (k === "wpct" || k === "lpct" || k === "headpct") return v == null ? null : v < 3 ? "低" : v > 97 ? "高" : null;
  return null;
}

/* ---- 各项的定义 ---- */
const VT = [
  { k: "weight", label: "体重", color: "var(--sky)", pct: "wpct", dim: "weight" },
  { k: "length", label: "身高", color: "var(--sage)", pct: "lpct", dim: "length" },
  { k: "head", label: "头围", color: "var(--honey)", pct: "headpct", dim: "head", opt: true },
  { k: "bmi", label: "BMI", color: "var(--slate)", pct: "bmipct", opt: true },
  { k: "bp", label: "血压", unit: "mmHg", opt: true, dec: 0, lines: [["bp_sys", "高压", "var(--rose)"], ["bp_dia", "低压", "var(--sky)"]] },
  { k: "pulse", label: "心率", unit: "次/分", color: "var(--rose)", opt: true, dec: 0 }
];
const VT_KEYS = ["weight", "length", "head", "bmi", "bp_sys", "bp_dia", "pulse", "wpct", "lpct", "headpct", "bmipct"];
/** 展开了哪几张卡 / 哪几张表（只在这次打开页面里记着，后台刷新重画不会收起） */
const VT_OPEN = new Set(["weight", "length"]);
if (typeof document !== "undefined") document.addEventListener("toggle", ev => { const d = ev.target; if (d && d.matches && d.matches("details[data-vt]")) { if (d.open) VT_OPEN.add(d.dataset.vt); else VT_OPEN.delete(d.dataset.vt); } }, true);

const ageTxt = (t, m) => (m == null ? "" : m < 24 ? t("{n} 个月", { n: m }) : m % 12 ? t("{y} 岁 {m} 个月", { y: Math.floor(m / 12), m: m % 12 }) : t("{y} 岁", { y: m / 12 }));

/** 时间走势折线：横轴按真实日期（刻度带年份），纵轴只取数据范围（不从 0 画起）。
 *  lines: [{ name, color, pts: [{ ts, v, tag, bad }] }]；tag（百分位 P62）写在点上方，点多时只写最后一个；bad = 超出范围，点画成红圈。
 *  bands: [{ t0, t1, lo, hi }] 正常范围浅色带；limits: [{ t0, t1, v, color }] 筛查线（虚线）。都按年龄分段，画在图的范围里 */
function timeLine(lines, { title = "", dec = 1, bands = [], limits = [] } = {}){
  const W = 300, Hh = 160, L = 34, R = 14, T = lines.length > 1 ? 24 : 16, B = 22;
  const all = lines.flatMap(l => l.pts); if (!all.length) return "";
  let t0 = Math.min(...all.map(p => p.ts)), t1 = Math.max(...all.map(p => p.ts));
  if (t1 - t0 < 20 * DAY) { t0 -= 15 * DAY; t1 += 15 * DAY; }   // 只有一两次：两边各留半个月，点不贴边
  let lo = Math.min(...all.map(p => p.v)), hi = Math.max(...all.map(p => p.v));
  const pad = (hi - lo) * 0.18 || Math.max(Math.abs(hi) * 0.05, 1); lo -= pad; hi += pad;
  const X = ts => L + (Math.min(Math.max(ts, t0), t1) - t0) / (t1 - t0) * (W - L - R), Y = v => T + (1 - (Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * (Hh - T - B);
  const r = v => Math.round(v * 10 ** dec) / 10 ** dec;
  const bandSvg = bands.filter(b => b.t1 > t0 && b.t0 < t1 && b.hi > lo && b.lo < hi).map(b => `<rect x="${X(b.t0).toFixed(1)}" y="${Y(b.hi).toFixed(1)}" width="${Math.max(0, X(b.t1) - X(b.t0)).toFixed(1)}" height="${Math.max(0, Y(b.lo) - Y(b.hi)).toFixed(1)}" fill="var(--sage)" opacity=".13"/>`).join("");
  const limSvg = limits.filter(b => b.t1 > t0 && b.t0 < t1 && b.v > lo && b.v < hi).map(b => `<line x1="${X(b.t0).toFixed(1)}" x2="${X(b.t1).toFixed(1)}" y1="${Y(b.v).toFixed(1)}" y2="${Y(b.v).toFixed(1)}" stroke="${b.color}" stroke-width="1.2" stroke-dasharray="4 3" opacity=".75"/>`).join("");
  const grid = [0.1, 0.5, 0.9].map(f => lo + (hi - lo) * f).map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--line)"/><text x="${L - 4}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end" class="ch-tick">${r(v)}</text>`).join("");
  const p2 = n => String(n).padStart(2, "0"), span = t1 - t0, short = span < 100 * DAY;
  const fmt = ts => { const d = new Date(ts); return `${d.getFullYear()}/${p2(d.getMonth() + 1)}${short ? "/" + p2(d.getDate()) : ""}`; };
  const full = ts => { const d = new Date(ts); return `${d.getFullYear()}/${p2(d.getMonth() + 1)}/${p2(d.getDate())}`; };
  const n = short ? 3 : 4, seen = new Set();
  const xt = Array.from({ length: n }, (_, i) => t0 + span * i / (n - 1)).map((ts, i) => { const s = fmt(ts); if (seen.has(s)) return ""; seen.add(s);
    return `<text x="${X(ts).toFixed(1)}" y="${Hh - 6}" text-anchor="${i === 0 ? "start" : i === n - 1 ? "end" : "middle"}" class="ch-tick">${s}</text>`; }).join("");
  const body = lines.map(l => { const p = [...l.pts].sort((a, b) => a.ts - b.ts); if (!p.length) return "";
    const path = p.map((q, i) => `${i ? "L" : "M"}${X(q.ts).toFixed(1)} ${Y(q.v).toFixed(1)}`).join(" ");
    const dots = p.map((q, i) => `<circle cx="${X(q.ts).toFixed(1)}" cy="${Y(q.v).toFixed(1)}" r="${q.bad ? 4.2 : 3.5}" fill="${q.bad ? "var(--surface)" : l.color}" stroke="${q.bad ? "var(--rose)" : "var(--surface)"}" stroke-width="${q.bad ? 2.2 : 1.2}"><title>${H(`${full(q.ts)} · ${l.name ? l.name + " " : ""}${q.v}${q.tag ? " · " + q.tag : ""}`)}</title></circle>
      ${q.tag && (p.length <= 8 || i === p.length - 1) ? `<text x="${X(q.ts).toFixed(1)}" y="${(Y(q.v) - 7).toFixed(1)}" text-anchor="${X(q.ts) < L + 14 ? "start" : X(q.ts) > W - R - 14 ? "end" : "middle"}" class="ch-val">${H(q.tag)}</text>` : ""}`).join("");
    return `<path d="${path}" fill="none" stroke="${l.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}`; }).join("");
  const legend = lines.length > 1 ? lines.map((l, i) => `<line x1="${L + i * 70}" x2="${L + i * 70 + 14}" y1="8" y2="8" stroke="${l.color}" stroke-width="2.5"/><text x="${L + i * 70 + 18}" y="11" class="ch-tick">${H(l.name)}</text>`).join("") : "";
  return `<figure class="lib-chart tline"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${H(title)}">${legend}${bandSvg}${grid}${limSvg}${body}${xt}</svg></figure>`;
}

/** 按年龄把 [t0, t1] 切成几段，每段用 fn(月龄) 的结果；结果一样的相邻段合并（心率在 3 个月、2 岁、10 岁换档） */
function segs(t0, t1, months, fn){
  const out = []; if (!(t1 >= t0)) return out;
  const step = Math.max(DAY * 7, (t1 - t0) / 400);
  for (let ts = t0 - 40 * DAY; ts <= t1 + 40 * DAY; ts += step) {
    const v = fn(months(ts)), last = out[out.length - 1];
    if (last && JSON.stringify(last.v) === JSON.stringify(v)) last.t1 = ts + step; else out.push({ t0: ts, t1: ts + step, v });
  }
  return out.filter(s => s.v);
}

/** 卡里线下面的一行「参考范围」：按现在的年龄说，写出处 */
function refLine(m, ctx){
  const { t } = ctx, now = ctx.months(Date.now()), age = ageTxt(t, now);
  if (m.k === "pulse") { const r = hrRange(now); return r ? t("{age}安静时心率常见范围 {lo}–{hi} 次/分（浅绿带，AHA PALS）；发热、哭闹、运动时会更快。", { age, lo: r.lo, hi: r.hi }) : t("填了孩子生日才能对照同龄范围。"); }
  if (m.k === "bp") { const r = bpLimit(now, ctx.sex);
    return r ? t("{age}：低于约 {s}/{d} mmHg 一般属正常（虚线，AAP 2017 简化筛查表）；到了或超过不等于高血压，请医生按身高百分位查表判断。", { age, s: r.sys, d: r.dia }) : t("1 岁以下一般不常规量血压；有疑问请问医生。"); }
  if (m.k === "bmi") return t("2 岁以上看 BMI 百分位：P5–P84 健康体重，P85–P94 超重，P95 及以上肥胖，低于 P5 偏瘦（CDC）。");
  return t("同龄百分位多在 P3–P97 之间；更要看是不是沿着自己的曲线走，短期内跨过两条主百分位线（比如 P50 → P10）请问医生（WHO / CDC 生长曲线）。");
}

function card(m, rows, ctx){
  const { t } = ctx, keys = m.lines ? m.lines.map(x => x[0]) : [m.k];
  const list = rows.filter(e => keys.some(k => has(e, k)));   // 新的在前
  if (m.opt && !list.length) return "";
  const u = m.dim ? ctx.unit(m.dim) : m.unit ? t(m.unit) : "", last = list[0], prev = list[1];
  const val = (k, v) => (m.dim ? Math.round(ctx.val(m.dim, v) * 10) / 10 : +v);
  const valTxt = e => (m.lines ? m.lines.map(([k]) => (has(e, k) ? val(k, e[k]) : "–")).join("/") : String(val(m.k, e[m.k])));
  const pctTxt = e => (m.pct && has(e, m.pct) ? `P${e[m.pct]}` : "");
  // 这一条超出范围了吗：心率、血压看数值；体重 / 身高 / 头围 / BMI 看百分位
  const bad = e => { const mo = ctx.months(e.ts);
    if (m.lines) return m.lines.map(([k]) => flag(k, has(e, k) ? +e[k] : null, mo, ctx.sex)).find(Boolean) || null;
    return m.pct ? flag(m.pct, has(e, m.pct) ? +e[m.pct] : null, mo, ctx.sex) : flag(m.k, +e[m.k], mo, ctx.sex); };
  const word = f => (f === "高" ? t("偏高") : f === "低" ? t("偏低") : "");
  const diff = !m.lines && last && prev ? Math.round((val(m.k, last[m.k]) - val(m.k, prev[m.k])) * 10) / 10 : null;
  const lf = last && bad(last), band = m.k === "bmi" && last && has(last, "bmipct") ? bmiBand(+last.bmipct) : null;
  const status = !last ? "" : lf ? `<span class="vt-flag bad">${word(lf)}</span>` : band ? `<span class="vt-flag ${band === "健康体重" ? "ok" : "bad"}">${t(band)}</span>`
    : (m.k === "pulse" || m.k === "bp") && (m.k === "pulse" ? hrRange(ctx.months(last.ts)) : bpLimit(ctx.months(last.ts), ctx.sex)) ? `<span class="vt-flag ok">${t("在正常范围")}</span>` : "";
  const head = last ? `<span class="vt-v num">${H(valTxt(last))}</span> ${status} <span class="small muted">${[H(u), pctTxt(last), ctx.day(last.ts), diff != null ? `${t("比上次")} ${diff > 0 ? "+" : ""}${diff}` : ""].filter(Boolean).join(" · ")}</span>` : `<span class="small muted">${t("还没有记录")}</span>`;
  const lines = (m.lines || [[m.k, "", m.color]]).map(([k, name, color]) => ({ name: t(name), color, pts: list.filter(e => has(e, k)).map(e => ({ ts: e.ts, v: val(k, e[k]), tag: k === m.k ? pctTxt(e) : "", bad: !!(m.lines ? flag(k, +e[k], ctx.months(e.ts), ctx.sex) : bad(e)) })) }));
  const ts = list.map(e => e.ts), t0 = Math.min(...ts), t1 = Math.max(...ts);
  const bands = m.k === "pulse" ? segs(t0, t1, ctx.months, hrRange).map(s => ({ t0: s.t0, t1: s.t1, lo: s.v.lo, hi: s.v.hi })) : [];
  const limits = m.k === "bp" ? segs(t0, t1, ctx.months, mo => bpLimit(mo, ctx.sex)).flatMap(s => [{ t0: s.t0, t1: s.t1, v: s.v.sys, color: "var(--rose)" }, { t0: s.t0, t1: s.t1, v: s.v.dia, color: "var(--sky)" }]) : [];
  const chart = list.length ? timeLine(lines, { title: t("{x} 走势", { x: t(m.label) }), dec: m.dec ?? 1, bands, limits }) : `<p class="small muted">${t("还没有记录：量一次，或者用 AI 录入一次体检。")}</p>`;
  const anyPct = m.pct && list.some(e => has(e, m.pct));
  const table = list.length ? `<details class="vt-tbl" data-vt="tbl:${m.k}" ${VT_OPEN.has("tbl:" + m.k) ? "open" : ""}><summary>${t("数据表")} <span class="small muted">${t("{n} 条", { n: list.length })}</span></summary>
    <div class="scroll-x"><table><thead><tr><th>${t("日期")}</th><th>${t("年龄")}</th><th>${m.lines ? `${t("高压")}/${t("低压")}` : t(m.label)}${u ? ` (${H(u)})` : ""}</th>${anyPct ? `<th>${t("百分位")}</th>` : ""}<th class="vt-src">${t("来源")}</th></tr></thead>
    <tbody>${list.map(e => { const f = bad(e); return `<tr><td class="num">${ctx.day(e.ts)}</td><td>${H(ageTxt(t, ctx.months(e.ts)))}</td><td class="num">${H(valTxt(e))}${f ? ` <span class="vt-flag bad">${word(f)}</span>` : ""}</td>${anyPct ? `<td class="num">${H(pctTxt(e) || "–")}</td>` : ""}<td class="vt-src">${H(ctx.src(e))}</td></tr>`; }).join("")}</tbody></table></div></details>` : "";
  return `<details class="panel vt-card" data-vt="${m.k}" style="--c:${m.color || m.lines[0][2]}" ${VT_OPEN.has(m.k) ? "open" : ""}><summary><b>${t(m.label)}</b> ${head}</summary>
    <div class="vt-body">${chart}${list.length ? `<p class="small muted vt-ref">${refLine(m, ctx)}</p>` : ""}${table}</div></details>`;
}
/** 整组卡片（电脑上两列）。rows = 这个孩子的「宝宝健康」记录 */
function vitalsHTML(rows, ctx){
  const list = (rows || []).filter(e => VT_KEYS.some(k => has(e, k))).sort((a, b) => b.ts - a.ts);
  return `<div class="vt-grid">${VT.map(m => card(m, list, ctx)).join("")}</div>
    <p class="small muted vt-foot">${ctx.t("正常范围只作参考，按孩子现在的年龄；是否正常、要不要处理，以儿科医生的判断为准。")}</p>`;
}

/** 给 AI 的摘要（不含姓名）：年龄、性别，每项最近 8 次（日期、当时年龄、数、百分位），和现在年龄的参考范围 */
function vitalsContext(rows, ctx){
  const { t } = ctx, now = ctx.months(Date.now()), list = (rows || []).filter(e => VT_KEYS.some(k => has(e, k))).sort((a, b) => b.ts - a.ts);
  const L = [t("孩子：{age}{sex}", { age: now == null ? t("年龄未填") : ageTxt(t, now), sex: ctx.sex === "m" ? `，${t("男孩")}` : ctx.sex === "f" ? `，${t("女孩")}` : "" })];
  for (const m of VT) {
    const keys = m.lines ? m.lines.map(x => x[0]) : [m.k], rs = list.filter(e => keys.some(k => has(e, k))).slice(0, 8);
    if (!rs.length) continue;
    const u = m.dim ? ctx.unit(m.dim) : m.unit ? t(m.unit) : "";
    const v = e => (m.lines ? m.lines.map(([k]) => (has(e, k) ? e[k] : "–")).join("/") : m.dim ? Math.round(ctx.val(m.dim, e[m.k]) * 10) / 10 : e[m.k]);
    L.push(`- ${t(m.label)}（${u || "—"}）：${rs.map(e => `${ctx.day(e.ts)}（${ageTxt(t, ctx.months(e.ts))}）${v(e)}${m.pct && has(e, m.pct) ? ` P${e[m.pct]}` : ""}`).join("；")}`);
    L.push(`  ${t("参考")}：${refLine(m, ctx)}`);
  }
  if (L.length === 1) L.push(t("还没有体征记录。"));
  return L.join("\n");
}

export { VT, VT_KEYS, VT_OPEN, HR, BP, hrRange, bpLimit, bmiBand, flag, timeLine, segs, vitalsHTML, vitalsContext };
