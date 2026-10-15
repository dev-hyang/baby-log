import { ask } from "./ask.js";
import { last } from "./derived.js";
import { mealCheck } from "./meal.js";
import { draft, drawForm, openForm, openSettings, pickType, readDraftInputs, readSettingsInputs } from "./sheet.js";
import { LS_KEY, S, child, childOf, isKidType, kidCount, setChild } from "./state.js";
import { importJSON, loadDemo, offerFile, putEntry, removeEntry, removeWhere, saveSettings, toCSV } from "./store.js";
import { sbAuth, sbFamily, sbLogout, syncNow } from "./sync.js";
import { UNIT_KEY, isUS } from "./units.js";
import { $, D, H, dayKey, dur, newId, startOfDay, toast } from "./util.js";
import { render, toggleKids } from "./views.js";

/* ============ events ============ */
document.addEventListener("click", async ev => {
  // the child menu closes on any click outside it; a click on an item falls through to its handler below
  if (!$("#kids").hidden && !ev.target.closest("#bname")) toggleKids(false);
  const t = ev.target.closest("button,[data-checkup]"); if (!t) return;
  if (t.id === "bname") { toggleKids(); return; }
  if (t.dataset.tab) { S.tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.add) { openForm(t.dataset.add, null, t.dataset.preset ? JSON.parse(t.dataset.preset) : {}); return; }
  if (t.dataset.edit) { const e = S.entries.find(x => x.id === t.dataset.edit); e && openForm(e.type, e); return; }
  if (t.dataset.filter) { S.filter = t.dataset.filter; render(); return; }
  if (t.dataset.logview) { S.logView = t.dataset.logview; render(); return; }
  if (t.dataset.gran) { S.gran = t.dataset.gran; render(); return; }
  if (t.dataset.metric) { S.metric = t.dataset.metric; render(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  if (t.dataset.mealday) {
    const cur = S.mealDay ?? startOfDay(Date.now());
    const next = startOfDay(cur + (+t.dataset.mealday) * D + 2 * H); // +2h guards against DST shifts
    S.mealDay = Math.min(next, startOfDay(Date.now())); render(); return;
  }
  if (t.dataset.mealcheck) { await mealCheck(t.dataset.feed, t.dataset.mealcheck); return; }
  if (t.dataset.copy) { try { await navigator.clipboard.writeText(t.dataset.copy); toast("已复制：" + t.dataset.copy); } catch (e) { toast("请手动搜索：" + t.dataset.copy); } return; }
  if (t.dataset.kidsel) { setChild(t.dataset.kidsel); S.mealDay = null; render(); $("#bname").focus(); return; }
  if (t.dataset.seg) { readDraftInputs(); const k = t.dataset.seg; draft[k] = (draft[k] === t.dataset.v && k !== "child") ? null : t.dataset.v; drawForm(k); return; }
  if (t.dataset.who) { // multi-select children for a shared activity; the primary child can be swapped but never emptied
    readDraftInputs(); const id = t.dataset.who, also = new Set(draft.also || []);
    if (id === childOf(draft)) { if (also.size) { draft.child = [...also][0]; also.delete(draft.child); } }
    else if (also.has(id)) also.delete(id); else also.add(id);
    draft.also = [...also]; drawForm(); return;
  }
  if (t.dataset.unitsSet) { try { localStorage.setItem(UNIT_KEY, t.dataset.unitsSet); } catch (e) {} openSettings(); render(); toast("单位已切换为" + (isUS() ? "美制" : "公制")); return; }
  if (t.dataset.themeSet !== undefined) { const v = t.dataset.themeSet; if (v) document.documentElement.dataset.theme = v; else delete document.documentElement.dataset.theme; try { localStorage.setItem(LS_KEY + ".theme", v); } catch (e) {} openSettings(); return; }
  switch (t.dataset.act) {
    case "close": $("#sheet").close(); break;
    case "save": { readDraftInputs(); const e = { ...draft };
      const also = e.also || []; delete e.also; delete e._pick; // form-only state never reaches storage
      if (isKidType(e.type)) e.child = childOf(e); // legacy records become explicit once edited
      if (e.type === "sleep" && e.end && e.end < e.ts) { toast("醒来时间要晚于入睡时间"); return; }
      $("#sheet").close(); await putEntry(e);
      for (const id of also) await putEntry({ ...e, id: newId(), child: id }); // one copy per extra child
      toast(also.length ? `已保存 ${also.length + 1} 条` : "已保存"); break; }
    case "who-change": readDraftInputs(); draft._pick = true; drawForm("child"); break;
    case "del": if (confirm("删除这条记录？")) { $("#sheet").close(); await removeEntry(draft.id); toast("已删除"); } break;
    case "sleepnow": { if (last(e => e.type === "sleep" && !e.end)) { toast("已经在记录睡眠了"); return; } await putEntry({ id: newId(), type: "sleep", ts: Date.now(), child: S.childId }); toast("开始记录睡眠"); break; }
    case "wake": { const e = S.entries.find(x => x.id === t.dataset.id); if (e) { await putEntry({ ...e, end: Date.now() }); toast(`这一觉睡了 ${dur(Date.now() - e.ts)}`); } break; }
    case "addpick": pickType(); break;
    case "settings": openSettings(); break;
    case "addrule": readSettingsInputs(); S.settings.medIntervals.push({ name: "", hours: "" }); openSettings(); break;
    case "addkid": readSettingsInputs(); S.settings.children.push({ id: newId(), name: "", birth: "" }); openSettings(); break;
    case "delkid": {
      readSettingsInputs();
      const c = S.settings.children[+t.dataset.i]; if (!c || S.settings.children.length < 2) break;
      const n = kidCount(c.id);
      if (n && !confirm(`${c.name || "这个孩子"} 有 ${n} 条记录，移除后这些记录会一起删除，无法撤销。建议先导出备份。继续吗？`)) break;
      if (n) await removeWhere(e => isKidType(e.type) && childOf(e) === c.id);
      S.settings.children = S.settings.children.filter(x => x.id !== c.id);
      if (S.childId === c.id) S.childId = null;
      await saveSettings(); openSettings(); toast(n ? `已移除并删除 ${n} 条记录` : "已移除"); break; }
    case "savesettings": readSettingsInputs(); $("#sheet").close(); await saveSettings(); toast("设置已保存"); break;
    case "export": offerFile(`母婴记录备份-${dayKey(Date.now())}.json`, JSON.stringify({ app: "xiaoyueliang", version: 1, exported: Date.now(), settings: S.settings, entries: S.entries }, null, 1), "application/json"); break;
    case "csv": offerFile(`母婴记录-${dayKey(Date.now())}.csv`, toCSV(), "text/csv"); break;
    case "import": $("#importFile").click(); break;
    case "demo": $("#sheet").open && $("#sheet").close(); await loadDemo(); break;
    case "cleardemo": { const n = await removeWhere(e => e.demo); toast(`已清除 ${n} 条演示记录`); break; }
    case "clearall": if (confirm("确定清空全部记录（所有孩子和妈妈的记录）？建议先导出备份。此操作无法撤销。")) { $("#sheet").close(); const n = await removeWhere(() => true); toast(`已清空 ${n} 条`); } break;
    case "ask": ask(); break;
    case "sb-login": await sbAuth("login"); break;
    case "sb-signup": await sbAuth("signup"); break;
    case "sb-create": await sbFamily("create"); break;
    case "sb-join": await sbFamily("join"); break;
    case "sb-logout": await sbLogout(); break;
    case "sb-sync": await syncNow(); toast("已同步"); break;
  }
});
document.addEventListener("change", async ev => {
  const c = ev.target.closest("[data-checkup]");
  if (c) { const ck = { ...(S.settings.checkups || {}) }; ck[S.childId] = { ...(ck[S.childId] || {}), [c.dataset.checkup]: c.checked }; S.settings.checkups = ck; await saveSettings(); return; }
  if (ev.target.id === "importFile" && ev.target.files[0]) { await importJSON(ev.target.files[0]); ev.target.value = ""; return; }
  if (draft && ev.target.closest("#sheetIn") && ev.target.type === "checkbox") { readDraftInputs(); drawForm(); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#kids").hidden) { toggleKids(false); $("#bname").focus(); } });
document.addEventListener("input", ev => {
  if (ev.target.id === "q") { S.q = ev.target.value; S.logFocus = true; render(); return; }
  if (ev.target.type === "range") { const o = ev.target.parentElement.querySelector("output"); if (o) o.textContent = ev.target.value; }
});
