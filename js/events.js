import { ask } from "./ask.js";
import { last } from "./derived.js";
import { setLang, t } from "./i18n.js";
import { mealCheck } from "./meal.js";
import { draft, drawForm, openForm, openSettings, pickType, readDraftInputs, readSettingsInputs } from "./sheet.js";
import { LS_KEY, S, child, childOf, isKidType, kidCount, matchCheckup, setChild } from "./state.js";
import { importJSON, loadDemo, offerFile, putEntry, removeEntry, removeWhere, saveSettings, toCSV } from "./store.js";
import { sbAuth, sbCreate, sbJoin, sbLogout, sbMember, sbResetCode, syncNow } from "./sync.js";
import { UNIT_KEY, isUS } from "./units.js";
import { $, D, H, dayKey, dur, newId, startOfDay, toast } from "./util.js";
import { render, toggleApps, toggleKids } from "./views.js";

/* ============ events ============ */
document.addEventListener("click", async ev => {
  // the child / app menus close on any click outside them; a click on an item falls through to its handler below
  if (!$("#kids").hidden && !ev.target.closest("#bname")) toggleKids(false);
  if (!$("#apps").hidden && !ev.target.closest("#appsw")) toggleApps(false);
  const t0 = ev.target.closest("button,[data-checkup]"); if (!t0) return;
  if (t0.id === "bname") { toggleKids(); return; }
  if (t0.id === "appsw") { toggleApps(); return; }
  if (t0.dataset.tab) { S.tab = t0.dataset.tab; render(); window.scrollTo(0, 0); return; }
  if (t0.dataset.add) { openForm(t0.dataset.add, null, t0.dataset.preset ? JSON.parse(t0.dataset.preset) : {}); return; }
  if (t0.dataset.edit) { const e = S.entries.find(x => x.id === t0.dataset.edit); e && openForm(e.type, e); return; }
  if (t0.dataset.filter) { S.filter = t0.dataset.filter; render(); return; }
  if (t0.dataset.logview) { S.logView = t0.dataset.logview; render(); return; }
  if (t0.dataset.gran) { S.gran = t0.dataset.gran; render(); return; }
  if (t0.dataset.ckview) { S.checkupView = t0.dataset.ckview; render(); return; }
  if (t0.dataset.metric) { S.metric = t0.dataset.metric; render(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  if (t0.dataset.mealday) {
    const cur = S.mealDay ?? startOfDay(Date.now());
    const next = startOfDay(cur + (+t0.dataset.mealday) * D + 2 * H); // +2h guards against DST shifts
    S.mealDay = Math.min(next, startOfDay(Date.now())); render(); return;
  }
  if (t0.dataset.mealcheck) { await mealCheck(t0.dataset.feed, t0.dataset.mealcheck); return; }
  if (t0.dataset.copy) { try { await navigator.clipboard.writeText(t0.dataset.copy); toast(t("已复制：{s}", { s: t0.dataset.copy })); } catch (e) { toast(t("请手动搜索：{s}", { s: t0.dataset.copy })); } return; }
  if (t0.dataset.kidsel) { setChild(t0.dataset.kidsel); S.mealDay = null; render(); $("#bname").focus(); return; }
  if (t0.dataset.member) { await sbMember(t0.dataset.member, t0.dataset.uid); return; }
  if (t0.dataset.seg) { readDraftInputs(); const k = t0.dataset.seg; draft[k] = (draft[k] === t0.dataset.v && k !== "child") ? null : t0.dataset.v; drawForm(k); return; }
  if (t0.dataset.who) { // multi-select children for a shared activity; the primary child can be swapped but never emptied
    readDraftInputs(); const id = t0.dataset.who, also = new Set(draft.also || []);
    if (id === childOf(draft)) { if (also.size) { draft.child = [...also][0]; also.delete(draft.child); } }
    else if (also.has(id)) also.delete(id); else also.add(id);
    draft.also = [...also]; drawForm(); return;
  }
  if (t0.dataset.unitsSet) { try { localStorage.setItem(UNIT_KEY, t0.dataset.unitsSet); } catch (e) {} openSettings(); render(); toast(t("单位已切换为{u}", { u: isUS() ? t("美制") : t("公制") })); return; }
  if (t0.dataset.langSet) { setLang(t0.dataset.langSet); render(); openSettings(); return; }
  if (t0.dataset.themeSet !== undefined) { const v = t0.dataset.themeSet; if (v) document.documentElement.dataset.theme = v; else delete document.documentElement.dataset.theme; try { localStorage.setItem(LS_KEY + ".theme", v); } catch (e) {} openSettings(); return; }
  switch (t0.dataset.act) {
    case "close": $("#sheet").close(); break;
    case "save": { readDraftInputs(); const e = { ...draft };
      const also = e.also || []; delete e.also; delete e._pick; // form-only state never reaches storage
      if (isKidType(e.type)) e.child = childOf(e); // legacy records become explicit once edited
      if (e.type === "sleep" && e.end && e.end < e.ts) { toast(t("醒来时间要晚于入睡时间")); return; }
      $("#sheet").close(); await putEntry(e);
      for (const id of also) await putEntry({ ...e, id: newId(), child: id }); // one copy per extra child
      // a well-child visit ticks its checkpoint in the schedule, so the reminder table needs no second step
      if (e.type === "baby" && e.src === "儿科体检") {
        const cid = childOf(e), c = matchCheckup(e.ts, cid), done = (S.settings.checkups || {})[cid] || {};
        if (c && !done[c.k]) { S.settings.checkups = { ...S.settings.checkups, [cid]: { ...done, [c.k]: true } }; await saveSettings(); toast(t("已保存，并勾选了 {label} 体检", { label: t(c.label) })); break; }
      }
      toast(also.length ? t("已保存 {n} 条", { n: also.length + 1 }) : t("已保存")); break; }
    case "who-change": readDraftInputs(); draft._pick = true; drawForm("child"); break;
    case "del": if (confirm(t("删除这条记录？"))) { $("#sheet").close(); await removeEntry(draft.id); toast(t("已删除")); } break;
    case "sleepnow": { if (last(e => e.type === "sleep" && !e.end)) { toast(t("已经在记录睡眠了")); return; } await putEntry({ id: newId(), type: "sleep", ts: Date.now(), child: S.childId }); toast(t("开始记录睡眠")); break; }
    case "wake": { const e = S.entries.find(x => x.id === t0.dataset.id); if (e) { await putEntry({ ...e, end: Date.now() }); toast(t("这一觉睡了 {d}", { d: dur(Date.now() - e.ts) })); } break; }
    case "addpick": pickType(); break;
    case "settings": openSettings(); break;
    case "addrule": readSettingsInputs(); S.settings.medIntervals.push({ name: "", hours: "" }); openSettings(); break;
    case "addkid": readSettingsInputs(); S.settings.children.push({ id: newId(), name: "", birth: "" }); openSettings(); break;
    case "delkid": {
      readSettingsInputs();
      const c = S.settings.children[+t0.dataset.i]; if (!c || S.settings.children.length < 2) break;
      const n = kidCount(c.id);
      if (n && !confirm(t("{name} 有 {n} 条记录，移除后这些记录会一起删除，无法撤销。建议先导出备份。继续吗？", { name: c.name || t("这个孩子"), n }))) break;
      if (n) await removeWhere(e => isKidType(e.type) && childOf(e) === c.id);
      S.settings.children = S.settings.children.filter(x => x.id !== c.id);
      if (S.childId === c.id) S.childId = null;
      await saveSettings(); openSettings(); toast(n ? t("已移除并删除 {n} 条记录", { n }) : t("已移除")); break; }
    case "savesettings": readSettingsInputs(); $("#sheet").close(); await saveSettings(); toast(t("设置已保存")); break;
    case "export": offerFile(`${t("母婴记录备份")}-${dayKey(Date.now())}.json`, JSON.stringify({ app: "xiaoyueliang", version: 1, exported: Date.now(), settings: S.settings, entries: S.entries }, null, 1), "application/json"); break;
    case "csv": offerFile(`${t("母婴记录")}-${dayKey(Date.now())}.csv`, toCSV(), "text/csv"); break;
    case "import": $("#importFile").click(); break;
    case "demo": $("#sheet").open && $("#sheet").close(); await loadDemo(); break;
    case "cleardemo": { const n = await removeWhere(e => e.demo); toast(t("已清除 {n} 条演示记录", { n })); break; }
    case "clearall": if (confirm(t("确定清空全部记录（所有孩子和妈妈的记录）？建议先导出备份。此操作无法撤销。"))) { $("#sheet").close(); const n = await removeWhere(() => true); toast(t("已清空 {n} 条", { n })); } break;
    case "ask": ask(); break;
    case "sb-login": await sbAuth("login"); break;
    case "sb-signup": await sbAuth("signup"); break;
    case "sb-create": await sbCreate(); break;
    case "sb-join": await sbJoin(); break;
    case "sb-logout": await sbLogout(); break;
    case "sb-reset-code": await sbResetCode(); break;
    case "sb-sync": await syncNow(); toast(t("已同步")); break;
  }
});
document.addEventListener("change", async ev => {
  const c = ev.target.closest("[data-checkup]");
  if (c) { const ck = { ...(S.settings.checkups || {}) }; ck[S.childId] = { ...(ck[S.childId] || {}), [c.dataset.checkup]: c.checked }; S.settings.checkups = ck; await saveSettings(); return; }
  if (ev.target.id === "importFile" && ev.target.files[0]) { await importJSON(ev.target.files[0]); ev.target.value = ""; return; }
  if (draft && ev.target.closest("#sheetIn") && ev.target.type === "checkbox") { readDraftInputs(); drawForm(); }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("#kids").hidden) { toggleKids(false); $("#bname").focus(); return; }
  if (e.key === "Escape" && !$("#apps").hidden) { toggleApps(false); $("#appsw").focus(); return; }
  // arrow keys walk the app list: ↓ / → next, ↑ / ← previous (also opens the menu from the switcher button)
  const arrows = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
  if (arrows[e.key] && (e.target.id === "appsw" || e.target.closest("#apps"))) {
    e.preventDefault();
    if ($("#apps").hidden) toggleApps(true);
    const items = [...$("#apps").querySelectorAll("a")], i = items.indexOf(document.activeElement);
    items[(i + arrows[e.key] + items.length) % items.length].focus();
  }
});
document.addEventListener("input", ev => {
  if (ev.target.id === "q") { S.q = ev.target.value; S.logFocus = true; render(); return; }
  if (ev.target.type === "range") { const o = ev.target.parentElement.querySelector("output"); if (o) o.textContent = ev.target.value; }
});
