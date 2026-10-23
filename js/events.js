import { ask } from "./ask.js";
import { last } from "./derived.js";
import { setLang, t } from "./i18n.js";
import { FAITH_TEMPLATE, readSettingsInputs } from "./me.js";
import { mealCheck } from "./meal.js";
import { closeSheet, draft, drawForm, openForm, pickType, readDraftInputs, rememberVis } from "./sheet.js";
import { heroCustom, heroKeys, resetCards, setCard } from "./stages.js";
import { FAITH_STEPS, LS_KEY, cleanRoutine, ROUTINE_TPL, S, child, childOf, faithOn, isKidType, kidCount, matchCheckup, routineToText, setChild, textToRoutine } from "./state.js";
import { importJSON, loadDemo, offerFile, putEntry, removeEntry, removeWhere, saveSettings, toCSV } from "./store.js";
import { sbAuth, sbCreate, sbJoin, sbLogout, sbMember, sbResetCode, syncNow, visSupported } from "./sync.js";
import { UNIT_KEY, isUS } from "./units.js";
import { $, D, H, dayKey, dur, fromInput, newId, startOfDay, toast } from "./util.js";
import { openPrint } from "./print.js";
import { heroPage, heroSettle, render, toggleKids } from "./views.js";

// a page reached from 我的 (settings, about …), from anywhere: the kids menu, the grow page, a form
function goTab(tab){ closeSheet(); S.tab = tab; render(); window.scrollTo(0, 0); }

/* ============ events ============ */
document.addEventListener("click", async ev => {
  // the child menu closes on any click outside it; a click on an item falls through to its handler below
  if (!$("#kids").hidden && !ev.target.closest("#bname")) toggleKids(false);
  const t0 = ev.target.closest("button,[data-checkup]"); if (!t0) return;
  if (t0.id === "bname") { toggleKids(); return; }
  if (t0.dataset.tab) { if (t0.dataset.slot !== undefined) S.heroEdit = +t0.dataset.slot; goTab(t0.dataset.tab); return; } // the card's gear opens the editor on that card
  if (t0.dataset.add) { openForm(t0.dataset.add, null, t0.dataset.preset ? JSON.parse(t0.dataset.preset) : {}); return; }
  if (t0.dataset.edit) { const e = S.entries.find(x => x.id === t0.dataset.edit); e && openForm(e.type, e); return; }
  if (t0.dataset.filter) { S.filter = t0.dataset.filter; render(); return; }
  if (t0.dataset.logview) { S.logView = t0.dataset.logview; render(); return; }
  if (t0.dataset.gran) { S.gran = t0.dataset.gran; render(); return; }
  if (t0.dataset.ckview) { S.checkupView = t0.dataset.ckview; render(); return; }
  if (t0.dataset.ckreset) { // back to the schedule's date for this visit
    const cd = { ...(S.settings.checkupDates || {}) }, mine = { ...(cd[S.childId] || {}) }; delete mine[t0.dataset.ckreset]; cd[S.childId] = mine; S.settings.checkupDates = cd;
    await saveSettings(); toast(t("已恢复时间表日期")); return;
  }
  if (t0.dataset.metric) { S.metric = t0.dataset.metric; render(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  if (t0.dataset.mealday) {
    const cur = S.mealDay ?? startOfDay(Date.now());
    const next = startOfDay(cur + (+t0.dataset.mealday) * D + 2 * H); // +2h guards against DST shifts
    S.mealDay = Math.min(next, startOfDay(Date.now())); render(); return;
  }
  if (t0.dataset.card) { // card manager chip: "quick:meal" / "stats:hero"
    const [kind, key] = t0.dataset.card.split(":");
    setCard(kind, key, t0.getAttribute("aria-pressed") !== "true");
    await saveSettings();
    const again = document.querySelector(`[data-card="${t0.dataset.card}"]`); again && again.focus(); // the page re-rendered: keep the keyboard place
    return;
  }
  if (t0.dataset.faith) { // settings → 信仰: switch the module on or off, or fill the statement template
    readSettingsInputs(); const f = S.settings.faith;
    if (t0.dataset.faith === "toggle") f.on = !f.on; else if (!f.statement) f.statement = t(FAITH_TEMPLATE);
    await saveSettings(); return;
  }
  if (t0.dataset.faithKid) { // show / hide the faith cards for one child
    readSettingsInputs(); const f = S.settings.faith, id = t0.dataset.faithKid;
    f.off = f.off.includes(id) ? f.off.filter(x => x !== id) : [...f.off, id];
    await saveSettings(); return;
  }
  if (t0.dataset.tpl) { // routine editor: append a template group to the text box (kept unsaved so it can be tweaked first)
    const g = ROUTINE_TPL[+t0.dataset.tpl], box = $("#routineSteps"); if (!g || !box) return;
    const add = routineToText([{ name: t(g.name), steps: g.steps.map(t) }]);
    box.value = box.value.trim() ? box.value.trim() + "\n\n" + add : add;
    box.focus(); toast(t("已加入，记得保存")); return;
  }
  if (t0.dataset.step) { // Today → 今天的习惯: one tap ticks the step, by default as done without a reminder
    await putEntry({ id: newId(), type: "routine", ts: Date.now(), child: S.childId, step: t0.dataset.step, self: true }); toast(t("已记录")); return;
  }
  if (t0.dataset.pottymin) { // top-card editor: how often to nudge about the potty
    (S.settings.pottyMin ||= {})[S.childId] = +t0.dataset.pottymin;
    await saveSettings(); const again = document.querySelector(`[data-pottymin="${t0.dataset.pottymin}"]`); again && again.focus(); return;
  }
  if (t0.dataset.heronav) { // arrows beside the top cards (mouse users): previous / next card, round and round
    const tr = document.querySelector(".herotrack"); if (!tr) return;
    heroSettle(tr); // clicking fast can carry the track towards its end: bring it back to the middle first
    const i = Math.max(0, Math.min(tr.children.length - 1, heroPage(tr) + +t0.dataset.heronav));
    tr.scrollTo({ left: i * (tr.clientWidth + 10), behavior: "smooth" }); return;
  }
  if (t0.dataset.heropage !== undefined) { // dots under the top cards: to that card, by the shortest way round
    const tr = document.querySelector(".herotrack"); if (!tr) return;
    heroSettle(tr); const n = tr.dataset.loop ? tr.children.length / 5 : tr.children.length, p = heroPage(tr), i = +t0.dataset.heropage;
    const base = p - (((p % n) + n) % n) + i, to = [base - n, base, base + n].filter(x => x >= 0 && x < tr.children.length).sort((a, b) => Math.abs(a - p) - Math.abs(b - p))[0];
    tr.scrollTo({ left: to * (tr.clientWidth + 10), behavior: "smooth" }); return;
  }
  if (t0.dataset.hc) { // top-card editor: "op:arg"
    const v = t0.dataset.hc, c = v.indexOf(":"), op = c < 0 ? v : v.slice(0, c), arg = c < 0 ? "" : v.slice(c + 1);
    const keys = heroKeys(), slot = Math.min(S.heroEdit || 0, keys.length - 1), hp = S.settings.heroPref ||= {};
    const readName = () => { const el = $("#hcName"); if (el && S.hcDraft) S.hcDraft.name = el.value.trim().slice(0, 30); };
    let ks = null;
    if (op === "set") { ks = keys.slice(); const j = ks.indexOf(arg); if (j >= 0 && j !== slot) ks[j] = ks[slot]; ks[slot] = arg; }
    else if (op === "sel") { S.heroEdit = +arg; render(); return; }
    else if (op === "add") { ks = [...keys, arg]; S.heroEdit = ks.length - 1; }
    else if (op === "up" || op === "down") { ks = keys.slice(); const i = +arg, j = i + (op === "up" ? -1 : 1); if (j >= 0 && j < ks.length) { [ks[i], ks[j]] = [ks[j], ks[i]]; if (S.heroEdit === i) S.heroEdit = j; } }
    else if (op === "del") { if (keys.length > 1) { ks = keys.filter((_, i) => i !== +arg); S.heroEdit = 0; } }
    else if (op === "reset") { delete hp[S.childId]; S.heroEdit = 0; }
    else if (op === "rm") { const cu = S.settings.heroCustom ||= {}; cu[S.childId] = (cu[S.childId] || []).filter(x => x.id !== arg); ks = keys.filter(k => k !== arg); S.hcDraft = null; }
    else if (op === "edit") { S.hcDraft = { ...heroCustom().find(x => x.id === arg) }; render(); return; }
    else if (op === "new") { S.hcDraft = { id: "", name: "", type: "food", kind: "" }; render(); return; }
    else if (op === "type") { readName(); S.hcDraft.type = arg; S.hcDraft.kind = ""; render(); return; }
    else if (op === "kind") { readName(); S.hcDraft.kind = S.hcDraft.kind === arg ? "" : arg; render(); return; }
    else if (op === "cancel") { S.hcDraft = null; render(); return; }
    if (ks) hp[S.childId] = ks;
    await saveSettings(); return;
  }
  if (t0.dataset.mealcheck) { await mealCheck(t0.dataset.feed, t0.dataset.mealcheck); return; }
  if (t0.dataset.copy) { try { await navigator.clipboard.writeText(t0.dataset.copy); toast(t("已复制：{s}", { s: t0.dataset.copy })); } catch (e) { toast(t("请手动搜索：{s}", { s: t0.dataset.copy })); } return; }
  if (t0.dataset.kidsel) { setChild(t0.dataset.kidsel); S.mealDay = null; S.heroIdx = 0; S.heroEdit = 0; render(); $("#bname").focus(); return; }
  if (t0.dataset.member) { await sbMember(t0.dataset.member, t0.dataset.uid); return; }
  if (t0.dataset.seg) { readDraftInputs(); const k = t0.dataset.seg; draft[k] = (draft[k] === t0.dataset.v && k !== "child" && k !== "vis") ? null : t0.dataset.v; drawForm(k); return; }
  if (t0.dataset.with) { // family members a record is shared with
    readDraftInputs(); const w = new Set(draft.with || []);
    if (w.has(t0.dataset.with)) w.delete(t0.dataset.with); else w.add(t0.dataset.with);
    draft.with = [...w]; drawForm(); return;
  }
  if (t0.dataset.who) { // multi-select children for a shared activity; the primary child can be swapped but never emptied
    readDraftInputs(); const id = t0.dataset.who, also = new Set(draft.also || []);
    if (id === childOf(draft)) { if (also.size) { draft.child = [...also][0]; also.delete(draft.child); } }
    else if (also.has(id)) also.delete(id); else also.add(id);
    draft.also = [...also]; drawForm(); return;
  }
  if (t0.dataset.unitsSet) { try { localStorage.setItem(UNIT_KEY, t0.dataset.unitsSet); } catch (e) {} readSettingsInputs(); render(); toast(t("单位已切换为{u}", { u: isUS() ? t("美制") : t("公制") })); return; }
  if (t0.dataset.langSet) { readSettingsInputs(); setLang(t0.dataset.langSet); render(); return; }
  if (t0.dataset.themeSet !== undefined) { const v = t0.dataset.themeSet; if (v) document.documentElement.dataset.theme = v; else delete document.documentElement.dataset.theme; try { localStorage.setItem(LS_KEY + ".theme", v); } catch (e) {} readSettingsInputs(); render(); return; }
  switch (t0.dataset.act) {
    case "close": closeSheet(); break;
    case "save": { readDraftInputs(); const e = { ...draft }; const isNewRecord = !S.entries.some(x => x.id === e.id);
      const also = e.also || []; delete e.also; delete e._pick; // form-only state never reaches storage
      if (isKidType(e.type)) e.child = childOf(e); // legacy records become explicit once edited
      if (e.type === "sleep" && e.end && e.end < e.ts) { toast(t("醒来时间要晚于入睡时间")); return; }
      if (e.vis === "shared" && !(e.with || []).length) { toast(t("请选择至少一位家人，或改成“仅我”")); return; }
      if (e.vis !== "shared") delete e.with;
      if (!e.vis || e.vis === "family") delete e.vis; // family-wide is the default and is not stored on the record
      if (isNewRecord && visSupported()) rememberVis({ type: e.type, vis: e.vis });
      closeSheet(); await putEntry(e);
      for (const id of also) await putEntry({ ...e, id: newId(), child: id }); // one copy per extra child
      // on Today the quick buttons sit above the list: scroll to the 今天 section and light the saved row up
      if (S.tab === "today" && e.ts >= startOfDay(Date.now())) {
        S.flashId = e.id; render();
        const h = $("#todaySec"); if (h) { const top = h.getBoundingClientRect().top + window.scrollY - 8; window.scrollTo(0, top); requestAnimationFrame(() => window.scrollTo(0, top)); }
        setTimeout(() => { S.flashId = null; }, 3000);
      }
      // a well-child visit ticks its checkpoint in the schedule, so the reminder table needs no second step
      if (e.type === "baby" && e.src === "儿科体检") {
        const cid = childOf(e), c = matchCheckup(e.ts, cid), done = (S.settings.checkups || {})[cid] || {};
        if (c && !done[c.k]) { S.settings.checkups = { ...S.settings.checkups, [cid]: { ...done, [c.k]: true } }; await saveSettings(); toast(t("已保存，并勾选了 {label} 体检", { label: t(c.label) })); break; }
      }
      toast(also.length ? t("已保存 {n} 条", { n: also.length + 1 }) : t("已保存")); break; }
    case "who-change": readDraftInputs(); draft._pick = true; drawForm("child"); break;
    case "del": if (confirm(t("删除这条记录？"))) { closeSheet(); await removeEntry(draft.id); toast(t("已删除")); } break;
    case "sleepnow": { if (last(e => e.type === "sleep" && !e.end)) { toast(t("已经在记录睡眠了")); return; } await putEntry({ id: newId(), type: "sleep", ts: Date.now(), child: S.childId }); window.scrollTo(0, 0); toast(t("开始记录睡眠")); break; }
    case "wake": { const e = S.entries.find(x => x.id === t0.dataset.id); if (e) { await putEntry({ ...e, end: Date.now() }); toast(t("这一觉睡了 {d}", { d: dur(Date.now() - e.ts) })); } break; }
    case "addpick": pickType(); break;
    case "settings": goTab("settings"); break;
    case "routine-save": { // card manager: "# group" lines and one step per line; an empty list hides the routine
      const list = cleanRoutine(textToRoutine($("#routineSteps").value)) || [];
      (S.settings.routine ||= {})[S.childId] = list; await saveSettings(); toast(t("习惯清单已保存")); break; }
    case "hc-save": { // top-card editor: save the child's own card (new ones are added to the end of the list)
      const d = S.hcDraft; if (!d) break;
      d.name = ($("#hcName").value || "").trim().slice(0, 30);
      const list = (S.settings.heroCustom ||= {})[S.childId] ||= [];
      if (d.id) { const j = list.findIndex(x => x.id === d.id); if (j >= 0) list[j] = { ...d }; }
      else { d.id = "u_" + Math.random().toString(36).slice(2, 8); list.push({ ...d }); const ks = [...heroKeys(), d.id]; (S.settings.heroPref ||= {})[S.childId] = ks; S.heroEdit = ks.length - 1; }
      S.hcDraft = null; await saveSettings(); toast(t("已保存")); break; }
    case "routine-reset": if (S.settings.routine) delete S.settings.routine[S.childId]; await saveSettings(); toast(t("已恢复默认清单")); break;
    case "cards-reset": resetCards(); await saveSettings(); toast(t("已恢复默认卡片")); break;
    case "print-meal": case "print-trend": case "print-timeline": case "print-medical": openPrint(t0.dataset.act.slice(6)); break;
    case "addrule": readSettingsInputs(); S.settings.medIntervals.push({ name: "", hours: "" }); render(); break;
    case "addkid": readSettingsInputs(); S.settings.children.push({ id: newId(), name: "", birth: "" }); render(); break;
    case "archivekid": { // hide the child everywhere; id and records stay, so restoring brings everything back
      readSettingsInputs();
      const c = S.settings.children[+t0.dataset.i]; if (!c || S.settings.children.filter(x => !x.archived).length < 2) break;
      c.archived = true;
      if (S.childId === c.id) S.childId = null;
      await saveSettings(); toast(t("已归档，记录都还在，可在下方恢复")); break; }
    case "restorekid": {
      readSettingsInputs();
      const c = S.settings.children.find(x => x.id === t0.dataset.id); if (!c) break;
      delete c.archived; await saveSettings(); toast(t("已恢复")); break; }
    case "purgekid": { // the only path that deletes a child's records: archived children only, name typed to confirm
      readSettingsInputs();
      const c = S.settings.children.find(x => x.id === t0.dataset.id); if (!c || !c.archived) break;
      const n = kidCount(c.id);
      if (n) {
        const word = c.name || t("删除");
        const typed = prompt(t("{name} 有 {n} 条记录，彻底删除后无法撤销（所有家人的设备也会同步删除）。建议先导出备份。确认请输入「{word}」：", { name: c.name || t("这个孩子"), n, word }));
        if (typed == null || typed.trim() !== word) { toast(t("没有输入一致，已取消")); break; }
        await removeWhere(e => isKidType(e.type) && childOf(e) === c.id);
      }
      S.settings.children = S.settings.children.filter(x => x.id !== c.id);
      await saveSettings(); toast(n ? t("已彻底删除 {n} 条记录", { n }) : t("已删除")); break; }
    case "savesettings": readSettingsInputs(); await saveSettings(); S.tab = "today"; render(); window.scrollTo(0, 0); toast(t("设置已保存")); break;
    case "export": offerFile(`${t("母婴记录备份")}-${dayKey(Date.now())}.json`, JSON.stringify({ app: "xiaoyueliang", version: 1, exported: Date.now(), settings: S.settings, entries: S.entries }, null, 1), "application/json"); break;
    case "csv": offerFile(`${t("母婴记录")}-${dayKey(Date.now())}.csv`, toCSV(), "text/csv"); break;
    case "import": $("#importFile").click(); break;
    case "demo": closeSheet(); await loadDemo(); S.tab = "today"; render(); window.scrollTo(0, 0); break;
    case "cleardemo": { const n = await removeWhere(e => e.demo); toast(t("已清除 {n} 条演示记录", { n })); break; }
    case "clearall": if (confirm(t("确定清空全部记录（所有孩子和妈妈的记录）？建议先导出备份。此操作无法撤销。"))) { closeSheet(); const n = await removeWhere(() => true); toast(t("已清空 {n} 条", { n })); } break;
    case "ask": ask(); break;
    case "sb-login": await sbAuth("login"); break;
    case "sb-signup": await sbAuth("signup"); break;
    case "sb-create": await sbCreate(); break;
    case "sb-join": await sbJoin(); break;
    case "sb-logout": await sbLogout(); break;
    case "sb-reset-code": await sbResetCode(); break;
    case "sb-sync": await syncNow(true); toast(t("已同步")); break;
  }
});
document.addEventListener("change", async ev => {
  // date picker in the meal table / timeline: jump straight to that day (never past today)
  if (ev.target.dataset.daypick !== undefined) { const ts = fromInput(ev.target.value + "T00:00"); if (ts) { S.mealDay = Math.min(startOfDay(ts), startOfDay(Date.now())); render(); } return; }
  const c = ev.target.closest("[data-checkup]");
  if (c) { const ck = { ...(S.settings.checkups || {}) }; ck[S.childId] = { ...(ck[S.childId] || {}), [c.dataset.checkup]: c.checked }; S.settings.checkups = ck; await saveSettings(); return; }
  // checkup date changed to the clinic's actual appointment (per child); an empty value clears the override
  if (ev.target.dataset.ckdate !== undefined) {
    const cd = { ...(S.settings.checkupDates || {}) }, mine = { ...(cd[S.childId] || {}) }, v = ev.target.value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) mine[ev.target.dataset.ckdate] = v; else delete mine[ev.target.dataset.ckdate];
    cd[S.childId] = mine; S.settings.checkupDates = cd; await saveSettings(); toast(v ? t("体检日期已改为 {date}", { date: v }) : t("已恢复时间表日期")); return;
  }
  if (ev.target.id === "importFile" && ev.target.files[0]) { await importJSON(ev.target.files[0]); ev.target.value = ""; return; }
  if (draft && ev.target.closest("#sheetIn") && ev.target.type === "checkbox") { readDraftInputs(); drawForm(); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#kids").hidden) { toggleKids(false); $("#bname").focus(); } });
document.addEventListener("input", ev => {
  if (ev.target.id === "q") { S.q = ev.target.value; S.logFocus = true; render(); return; }
  if (ev.target.type === "range") { const o = ev.target.parentElement.querySelector("output"); if (o) o.textContent = ev.target.value; }
});

/* ---- top-card list: drag a pill up or down by its ⋮⋮ grip to reorder (mouse: anywhere on the pill); swipe a pill left to reveal 移除 ---- */
const SWIPE_GO = 0.4; // swiped this far across (as a share of the pill) and let go, the card is removed
let drag = null, dragged = false;
document.addEventListener("pointerdown", ev => {
  const pill = ev.target.closest(".hcpill"); if (!pill || ev.button > 0 || ev.target.closest(".hcedit")) return;
  const row = pill.parentElement, rows = [...row.parentElement.children];
  drag = { pill, row, rows, mode: null, touch: ev.pointerType !== "mouse", grip: !!ev.target.closest(".grip"), canSwipe: rows.length > 1, from: rows.indexOf(row), to: rows.indexOf(row), x0: ev.clientX, y0: ev.clientY, id: ev.pointerId,
    h: row.offsetHeight, mids: rows.map(r => r.offsetTop + r.offsetHeight / 2), top: row.offsetTop, off0: ev.clientY - row.parentElement.getBoundingClientRect().top, x: 0 };
});
document.addEventListener("pointermove", ev => {
  if (!drag || ev.pointerId !== drag.id) return;
  const dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
  if (!drag.mode) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
    // up/down reorders (touch: only from the grip, so the page still scrolls); left/right swipes the pill (not from the grip)
    drag.mode = Math.abs(dy) > Math.abs(dx) ? (!drag.touch || drag.grip ? "reorder" : "none") : (!drag.grip && drag.canSwipe ? "swipe" : "none");
    if (drag.mode === "none") { drag = null; return; }
    drag.row.classList.add(drag.mode === "reorder" ? "dragging" : "swiping");
    try { drag.pill.setPointerCapture(drag.id); } catch (e) { /* capture is only a convenience */ }
  }
  if (drag.mode === "swipe") { // the pill follows the finger; the red 移除 behind it says "let go to remove" once it is far enough
    const w = drag.pill.offsetWidth; drag.x = Math.max(-w, Math.min(0, dx)); drag.pill.style.transform = `translateX(${drag.x}px)`; drag.go = drag.x < -w * SWIPE_GO; drag.row.classList.toggle("ready", drag.go); return;
  }
  const lo = -drag.top, hi = drag.mids.at(-1) + drag.rows.at(-1).offsetHeight / 2 - drag.top - drag.h, y = Math.max(lo, Math.min(hi, dy));
  drag.row.style.transform = `translateY(${y}px)`;
  // the pointer decides the slot: past a lower neighbour's middle it moves down, above an upper one's middle it moves up
  const centre = drag.off0 + dy;
  const below = drag.mids.filter((m, i) => i > drag.from && centre > m).length, above = drag.mids.filter((m, i) => i < drag.from && centre < m).length;
  const to = below ? drag.from + below : drag.from - above; drag.to = to;
  drag.rows.forEach((r, i) => { if (i === drag.from) return; r.style.transform = i > drag.from && i <= to ? `translateY(${-(drag.h + 8)}px)` : i < drag.from && i >= to ? `translateY(${drag.h + 8}px)` : ""; });
});
async function endDrag(ev, cancel){
  if (!drag || ev.pointerId !== drag.id) return;
  const d = drag; drag = null;
  d.rows.forEach(r => { r.style.transform = ""; r.classList.remove("dragging"); });
  d.row.classList.remove("swiping"); if (!(d.mode === "swipe" && d.go && !cancel)) d.pill.style.transform = "";
  if (!d.mode) return;
  dragged = true; setTimeout(() => { dragged = false; }, 0); // the click that follows the release must not select the pill
  if (d.mode === "swipe") {
    d.row.classList.remove("ready");
    if (cancel || !d.go) return; // not far enough: the pill springs back
    d.row.classList.add("leaving"); d.pill.style.transform = `translateX(${-d.pill.offsetWidth}px)`; await new Promise(r => setTimeout(r, 180));
    const ks = heroKeys().filter((_, i) => i !== d.from); (S.settings.heroPref ||= {})[S.childId] = ks; S.heroEdit = 0; await saveSettings(); return;
  }
  if (cancel || d.to === d.from) return;
  const ks = heroKeys().slice(); const [k] = ks.splice(d.from, 1); ks.splice(d.to, 0, k);
  (S.settings.heroPref ||= {})[S.childId] = ks; S.heroEdit = d.to; await saveSettings();
}
document.addEventListener("pointerup", ev => endDrag(ev, false));
document.addEventListener("pointercancel", ev => endDrag(ev, true));
document.addEventListener("click", ev => { if (dragged) { ev.stopPropagation(); ev.preventDefault(); } }, true);
// keyboard: ↑ ↓ move the focused card, Delete removes it
document.addEventListener("keydown", async ev => {
  const b = ev.target.closest && ev.target.closest(".hclab"); if (!b || !["ArrowUp", "ArrowDown", "Delete"].includes(ev.key)) return;
  ev.preventDefault();
  const keys = heroKeys().slice(), i = +b.dataset.hc.split(":")[1], hp = S.settings.heroPref ||= {};
  if (ev.key === "Delete") { if (keys.length < 2) return; keys.splice(i, 1); S.heroEdit = 0; }
  else { const j = i + (ev.key === "ArrowUp" ? -1 : 1); if (j < 0 || j >= keys.length) return; [keys[i], keys[j]] = [keys[j], keys[i]]; S.heroEdit = j; }
  hp[S.childId] = keys; await saveSettings();
  const again = document.querySelector(`[data-hc="sel:${ev.key === "Delete" ? 0 : S.heroEdit}"]`); again && again.focus();
});

// language chosen from the header switcher (shared component)
document.addEventListener("eco-set-lang", e => { readSettingsInputs(); setLang(e.detail); render(); });
