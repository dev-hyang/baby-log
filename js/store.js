import { t } from "./i18n.js";
import { S, child, childName, childOf, isKidType, normalizeSettings, saveLocal } from "./state.js";
import { SB, loadTombs, saveTombs, syncNow } from "./sync.js";
import { TYPES, summary, typeLabel } from "./types.js";
import { $, D, H, dayKey, hm, newId, startOfDay, toast } from "./util.js";
import { render, renderStatus } from "./views.js";

function cloudFail(){ S.mode = "local"; S.col = null; S.prof = null; renderStatus(); toast(t("云端保存失败，记录已存在本设备")); }

async function waitForClaude(){
  for (let i = 0; i < 30; i++) { if (window.claude && typeof window.claude.use === "function") return true; await new Promise(r => setTimeout(r, 100)); }
  return false;
}
async function initCloud(){
  if (!(await waitForClaude())) return;
  claude.use("sample").then(s => { S.sample = s; if (S.tab === "learn") render(); }).catch(() => {});
  try {
    const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
    if (!db || !user) return;
    const uid = await user.id(); if (!uid) return;
    const prof = db.doc("data/users/" + uid + "/profile");
    const col = prof.collection("entries");
    const [ps, qs] = await Promise.all([prof.get(), col.limit(1000).get()]);
    const map = new Map(qs.docs.map(d => { const v = { ...d.data() }; return [v.id, v]; }));
    const toUpload = [];
    for (const e of S.entries) { const c = map.get(e.id); if (!c || (e.updated || 0) > (c.updated || 0)) { map.set(e.id, e); toUpload.push(e); } }
    if (ps.exists && ps.data().settings) S.settings = { ...S.settings, ...ps.data().settings };
    normalizeSettings();
    S.entries = [...map.values()]; S.col = col; S.prof = prof; S.mode = "cloud";
    saveLocal(); render();
    for (const e of toUpload) await col.doc(e.id).set(JSON.parse(JSON.stringify(e)));
    if (!ps.exists) await prof.set({ settings: S.settings });
  } catch (err) { S.mode = "local"; S.col = null; S.prof = null; renderStatus(); }
}
// Strip local-only bookkeeping fields before anything leaves the device
function clean(e){ const o = JSON.parse(JSON.stringify(e)); delete o._dirty; delete o.by; return o; }

/* One place that decides where changes go: family cloud (Supabase), Claude db, or local only */
async function persist(changed = [], deleted = []){
  if (S.mode === "family") {
    changed.forEach(e => { e._dirty = true; });
    if (deleted.length) saveTombs(loadTombs().concat(deleted.map(e => ({ id: e.id, type: e.type, ts: e.ts }))));
    saveLocal(); render(); syncNow(); return;
  }
  saveLocal(); render();
  if (S.col) { try { for (const e of changed) await S.col.doc(e.id).set(clean(e)); for (const e of deleted) await S.col.doc(e.id).delete(); } catch (err) { cloudFail(); } }
}
async function putEntry(e){
  e.updated = Date.now();
  const i = S.entries.findIndex(x => x.id === e.id);
  if (i >= 0) S.entries[i] = e; else S.entries.push(e);
  await persist([e]);
}
async function removeEntry(id){
  const gone = S.entries.filter(x => x.id === id);
  S.entries = S.entries.filter(x => x.id !== id);
  await persist([], gone);
}
async function saveSettings(){
  normalizeSettings(); saveLocal(); render();
  if (S.mode === "family" && SB.family) {
    const { error } = await SB.client.from("families").update({ settings: JSON.parse(JSON.stringify(S.settings)) }).eq("id", SB.family.id);
    if (error) toast(t("设置暂时没同步到云端，联网后再保存一次"));
    return;
  }
  if (S.prof) { try { await S.prof.set({ settings: JSON.parse(JSON.stringify(S.settings)) }); } catch (err) { cloudFail(); } }
}

/* ============ import / export ============ */
async function offerFile(filename, text, mime){
  let dl = null;
  if (window.claude?.use) dl = await claude.use("downloads").catch(() => null);
  if (dl) { try { await dl.save({ filename, data: text }); return; } catch (e) { if (e && e.code !== "unavailable") { toast(t("没有保存文件")); return; } } }
  try { const url = URL.createObjectURL(new Blob([text], { type: mime })); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
  catch (e) { toast(t("当前环境无法下载文件")); }
}
function toCSV(){
  const rows = [[t("日期"), t("时间"), t("孩子"), t("类型"), t("内容"), t("结束时间"), t("备注")]];
  for (const e of S.entries.slice().sort((a, b) => a.ts - b.ts)) rows.push([dayKey(e.ts), hm(e.ts), isKidType(e.type) ? childName(childOf(e)) : t("妈妈"), typeLabel(e.type), summary(e), e.end ? dayKey(e.end) + " " + hm(e.end) : "", e.note || ""]);
  return "﻿" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}
async function importJSON(file){
  try {
    const o = JSON.parse(await file.text());
    if (!Array.isArray(o.entries)) throw new Error("bad");
    const valid = o.entries.filter(e => e && typeof e.id === "string" && TYPES[e.type] && typeof e.ts === "number");
    const ids = new Set(S.entries.map(e => e.id));
    const added = valid.filter(e => !ids.has(e.id));
    if (o.settings && typeof o.settings === "object") { S.settings = { ...S.settings, ...o.settings }; normalizeSettings(); }
    S.entries.push(...added);
    await persist(added); await saveSettings(); toast(t("已恢复 {n} 条记录", { n: added.length }));
  } catch (e) { toast(t("文件格式不对：请选择从这里导出的 JSON 备份")); }
}
async function loadDemo(){
  const now = Date.now(), list = [];
  if (!child().birth) { child().birth = dayKey(now - 24 * D); normalizeSettings(); }
  const span = 16; let t0 = now - span * D, side = 0;
  while (t0 < now - 40 * 60e3) {
    const bottle = Math.random() < .2;
    const grow = 1 - (now - t0) / (span * D); // 0 → 1 across the demo period
    list.push(bottle ? { type: "feed", ts: t0, method: Math.random() < .5 ? "配方奶" : "母乳瓶喂", ml: 40 + Math.round(grow * 4 + Math.random() * 3) * 10 }
                     : { type: "feed", ts: t0, method: "亲喂", [side ? "right" : "left"]: 8 + Math.round(Math.random() * 10) });
    side ^= 1;
    list.push({ type: "diaper", ts: t0 + 10 * 60e3, pee: true, poop: Math.random() < .35, color: "黄" });
    const s = t0 + 25 * 60e3, len = (new Date(s).getHours() < 7 || new Date(s).getHours() > 21) ? 100 + grow * 70 + Math.random() * 50 : 40 + Math.random() * 70;
    list.push({ type: "sleep", ts: s, end: s + len * 60e3, where: "婴儿床", how: Math.random() < .5 ? "奶睡" : "抱睡" });
    t0 += (2.2 + Math.random() * 1.2) * H;
  }
  for (let i = 3; i >= 0; i--) {
    const d0 = startOfDay(now) - i * D;
    list.push({ type: "mbody", ts: d0 + 9 * H, weight: +(64.5 - (3 - i) * .3).toFixed(1), lochia: i > 1 ? "中" : "少", lcolor: "粉/褐", pain: 5 - (3 - i), mood: 2 + (3 - i) % 3, sleepHrs: 4 + (3 - i) * .5 });
    if (d0 + 10 * H < now) list.push({ type: "mmed", ts: d0 + 10 * H, cat: "止疼药", name: t("布洛芬"), dose: t("1片") });
    if (d0 + 16 * H < now) list.push({ type: "mmed", ts: d0 + 16 * H, cat: "止疼药", name: t("泰诺"), dose: t("1片") });
    if (d0 + 10 * H < now) list.push({ type: "mmed", ts: d0 + 10 * H + 60e3, cat: "维生素", name: t("复合维生素、铁") });
    if (d0 + 11 * H < now) list.push({ type: "bmed", ts: d0 + 11 * H, cat: "维生素D", name: t("维生素D滴剂"), dose: t("1滴") });
  }
  list.push({ type: "baby", ts: now - 2 * D, weight: 3.42, temp: 36.8 }, { type: "baby", ts: now - 9 * D, weight: 3.18 }, { type: "baby", ts: now - 12 * D, weight: 3.35, length: 50, head: 34 });
  const items = list.filter(e => e.ts < now).map(e => ({ ...e, id: newId() + Math.random().toString(36).slice(2, 4), demo: true, updated: now, ...(isKidType(e.type) ? { child: S.childId } : {}) }));
  if (S.mode === "family") { toast(t("家庭模式下不能载入演示数据，以免混进真实记录")); return; }
  S.entries.push(...items); await persist(items); await saveSettings();
  toast(t("已载入 {n} 条演示记录", { n: items.length }));
}
async function removeWhere(pred){
  const gone = S.entries.filter(pred); S.entries = S.entries.filter(e => !pred(e));
  await persist([], gone);
  return gone.length;
}

export { cloudFail, waitForClaude, initCloud, clean, persist, putEntry, removeEntry, saveSettings, offerFile, toCSV, importJSON, loadDemo, removeWhere };
