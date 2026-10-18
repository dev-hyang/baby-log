import { t } from "./i18n.js";
import { openForm } from "./sheet.js";
import { S, babyAgeDays, child, childOf, vis } from "./state.js";
import { putEntry } from "./store.js";
import { isUS, toDisp, trim, unitOf } from "./units.js";
import { $, D, H, dayKey, esc, hm, newId, num, startOfDay, toast, weekday } from "./util.js";

/* ---------- 按餐表格：每次喂奶一行，固定列，尿/便可直接打勾 ---------- */
function mealRows(){
  const all = vis();
  const feeds = all.filter(e => e.type === "feed" && e.method !== "吸奶").sort((a, b) => a.ts - b.ts);
  return feeds.map((f, i) => {
    const from = f.ts, to = feeds[i + 1] ? feeds[i + 1].ts : Date.now() + 60e3;
    const inWin = e => e.ts >= from && e.ts < to;
    const diapers = all.filter(e => e.type === "diaper" && inWin(e)).sort((a, b) => a.ts - b.ts);
    const sleeps = all.filter(e => e.type === "sleep" && inWin(e));
    const meds = all.filter(e => (e.type === "mmed" || e.type === "bmed") && inWin(e));
    return {
      f, gap: i ? f.ts - feeds[i - 1].ts : null,
      pee: diapers.filter(d => d.pee), poop: diapers.filter(d => d.poop), diapers,
      sleepMs: sleeps.reduce((a, e) => a + ((e.end || Date.now()) - e.ts), 0), sleeps,
      meds: meds.map(m => (m.type === "bmed" ? t("宝宝") + " " : "") + (m.name || t(m.cat || ""))).filter(Boolean)
    };
  });
}
/* day navigation shared by the meal table and the timeline: ‹ previous day, a date picker to jump straight
   to a day, next day › (disabled on today). The chosen day lives in S.mealDay so both views stay on it. */
function dayNavHTML(d0){
  const isToday = d0 === startOfDay(Date.now());
  return `<div class="daynav">
    <button class="iconbtn" data-mealday="-1" aria-label="${t("前一天")}">‹</button>
    <div class="daypick"><input type="date" data-daypick value="${dayKey(d0)}" max="${dayKey(Date.now())}" aria-label="${t("选择日期")}"><div class="small muted">${weekday(d0)}${isToday ? " · " + t("今天") : ""}</div></div>
    <button class="iconbtn" data-mealday="1" aria-label="${t("后一天")}" ${isToday ? "disabled" : ""}>›</button>
  </div>`;
}
function viewMeal(){
  const d0 = S.mealDay ?? startOfDay(Date.now());
  const rows = mealRows().filter(r => r.f.ts >= d0 && r.f.ts < d0 + D);
  const isToday = d0 === startOfDay(Date.now());
  const sum = (k) => rows.reduce((a, r) => a + (+r.f[k] || 0), 0);
  const newborn = (babyAgeDays(d0) ?? 999) < 91;
  const ck = (r, kind) => {
    const n = r[kind].length;
    const what = kind === "pee" ? t("尿") : t("便");
    const state = n ? t("已记录{n}次，点开修改", { n }) : t("未记录，点一下打勾");
    return `<td class="ck"><button class="cellbtn ${n ? "on" : ""}" data-mealcheck="${kind}" data-feed="${r.f.id}" aria-label="${t("{time} 这一餐{what}：{state}", { time: hm(r.f.ts), what, state })}">${n ? "✓" + (n > 1 ? n : "") : "○"}</button></td>`;
  };
  const cell = (r, txt, label) => `<td><button class="cellbtn" data-edit="${r.f.id}" aria-label="${label}">${txt}</button></td>`;
  const body = rows.map(r => {
    const f = r.f, poopColors = r.poop.map(p => p.color).filter(Boolean).map(c => t(c)).join("、");
    const longGap = newborn && r.gap && r.gap >= 4 * H;
    return `<tr>
      <td class="t"><button class="cellbtn" style="text-align:left" data-edit="${f.id}" aria-label="${t("修改 {time} 的喂奶", { time: hm(f.ts) })}">${hm(f.ts)}</button></td>
      <td class="gap ${longGap ? "long" : ""}">${r.gap ? (r.gap / H).toFixed(1) + "h" : "–"}</td>
      ${cell(r, esc(f.method ? t(f.method) : ""), t("方式"))}
      ${cell(r, f.left || "", t("左侧分钟"))}
      ${cell(r, f.right || "", t("右侧分钟"))}
      ${cell(r, f.ml ? trim(toDisp("vol", f.ml), isUS() ? 1 : 0) : "", t("奶量"))}
      ${ck(r, "pee")}${ck(r, "poop")}
      <td class="num">${r.sleepMs ? (r.sleepMs / H).toFixed(1) + "h" : ""}</td>
      <td class="left">${esc([poopColors && t("便") + poopColors, ...r.meds, f.note].filter(Boolean).join(" · "))}</td></tr>`;
  }).join("");
  const peeN = rows.reduce((a, r) => a + r.pee.length, 0), poopN = rows.reduce((a, r) => a + r.poop.length, 0);
  const sleepT = rows.reduce((a, r) => a + r.sleepMs, 0);
  return `
  ${dayNavHTML(d0)}
  ${rows.length ? `<div class="meal-wrap"><table class="meal">
    <caption class="small muted" style="caption-side:bottom;text-align:left;padding:8px 10px">${t("每行是一餐：尿布、睡眠、用药按“这一餐到下一餐之间”归到该行。点 ○ 直接打勾，点其他格子修改这一餐。")}</caption>
    <thead><tr><th class="t">${t("时间")}</th><th>${t("距上餐")}</th><th>${t("方式")}</th><th>${t("左<br>分钟")}</th><th>${t("右<br>分钟")}</th><th>${t("奶量")}<br>${unitOf("vol")}</th><th>${t("尿")}</th><th>${t("便")}</th><th>${t("之后<br>睡眠")}</th><th style="text-align:left">${t("备注 / 用药")}</th></tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td class="t">${t("{n} 餐", { n: rows.length })}</td><td></td><td></td><td>${sum("left") || ""}</td><td>${sum("right") || ""}</td><td>${sum("ml") ? trim(toDisp("vol", sum("ml")), isUS() ? 1 : 0) : ""}</td><td>${peeN}</td><td>${poopN}</td><td>${sleepT ? (sleepT / H).toFixed(1) + "h" : ""}</td><td></td></tr></tfoot>
  </table></div>
  ${newborn ? `<p class="small muted" style="margin-top:8px">${t("距上餐 ≥ 4 小时标红，方便发现间隔偏长的时段。新生儿一般 24 小时喂 8–12 次，具体以医生建议为准。")}</p>` : ""}`
  : `<div class="empty"><div class="eicon" aria-hidden="true">🍼</div>${t("这一天没有喂奶记录。")}${isToday ? `<br><button class="btn" data-add="feed" data-preset='{"method":"亲喂"}'>${t("记录一次喂奶")}</button>` : ""}</div>`}`;
}

/* tap ○ to tick 尿/便 for this meal; tap ✓ to open that diaper record */
async function mealCheck(feedId, kind){
  const r = mealRows().find(x => x.f.id === feedId); if (!r) return;
  if (r[kind].length) { openForm("diaper", r[kind][r[kind].length - 1]); return; }
  const other = r.diapers.find(d => !d[kind]);
  if (other) await putEntry({ ...other, [kind]: true });
  else await putEntry({ id: newId(), type: "diaper", ts: r.f.ts + 60e3, child: childOf(r.f), pee: kind === "pee", poop: kind === "poop" });
  toast(kind === "poop" ? t("已打勾，点 ✓ 可补充大便颜色") : t("已打勾"));
}

export { mealRows, dayNavHTML, viewMeal, mealCheck };
