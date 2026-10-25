import { SUPABASE_ANON_KEY, SUPABASE_JS, SUPABASE_URL } from "./config.js";
import { runScheduled } from "./backup.js";
import { last } from "./derived.js";
import { t } from "./i18n.js";
import { refreshSettingsIfOpen } from "./me.js";
import { LS_KEY, S, child, normalizeSettings, saveLocal } from "./state.js";
import { clean } from "./store.js";
import { trim } from "./units.js";
import { $, esc, num, toast } from "./util.js";
import { render, renderStatus } from "./views.js";

/* ============ Supabase family sync ============
   Accounts: whoever creates a family signs up with an email (that account can get the family back on a
   new phone). Everyone else joins with the invite code only: the device gets an anonymous Supabase user,
   which is linked to the family by join_family(). Roles: the creator is an owner (家主); owners can reset
   the invite code, promote / demote and remove members (server-side checks in migration 009). */
/* Record visibility (migration 012): entries.visibility is 'private' (only the author), 'shared' (the author and
   shared_with) or 'family' (everyone, the default). The server enforces it in row-level security, so a device
   only ever receives records its member may see. SB.vis says the columns exist; without the migration the app
   behaves as before and hides the control. A record keeps e.vis / e.with only when it is not family-wide, and
   e.cby is its author. */
const SB = { configured: false, client: null, uid: undefined, user: null, family: null, members: {}, channel: null, syncing: false, syncStarted: 0, runId: 0, again: false, busy: false, vis: false, reconciledAt: 0, forceReconcile: false };
const SYNC_KEY = LS_KEY + ".sync", TOMB_KEY = LS_KEY + ".tomb";
const loadJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch (e) { return d; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const loadTombs = () => loadJSON(TOMB_KEY, []), saveTombs = v => saveJSON(TOMB_KEY, v);
const isAnon = () => !!(SB.user && (SB.user.is_anonymous || !SB.user.email));
/* This device belonged to a family but the login is gone (the phone cleared site data, or the session expired and
   could not be refreshed), or the family could not be looked up (no network at start). Changes made meanwhile keep
   being marked as pending (see store.js) so they upload once the device is back in the family, and the status line
   says what happened instead of a quiet "saved on this device". SB.uid stays undefined until auth has answered. */
const lapsed = () => S.mode !== "family" && SB.configured && SB.uid !== undefined && !!loadJSON(SYNC_KEY, {}).familyId;
const isOwner = () => !!(SB.user && SB.members[SB.user.id] && SB.members[SB.user.id].role === "owner");
const memberName = uid => (SB.members[uid] || {}).name;
// one entry per distinct name: a member who re-joined from a new device after clearing the browser shows once
const memberNames = () => [...new Set(Object.values(SB.members).map(m => m.name))];

function initSupabase(){
  const hp = new URLSearchParams(location.hash.slice(1));
  if (hp.get("error_code")) {
    const code = hp.get("error_code");
    setTimeout(() => toast(code === "otp_expired" ? t("确认链接已失效：请直接用邮箱和密码登录试试，不行再重新注册") : t("登录链接有问题：{e}", { e: hp.get("error_description") || code })), 300);
    history.replaceState(null, "", location.pathname + location.search);
  }
  SB.configured = /^https:\/\/.+/.test(SUPABASE_URL) && !SUPABASE_URL.includes("YOUR-") && !SUPABASE_ANON_KEY.includes("YOUR-");
  if (!SB.configured) return false;
  const tag = document.createElement("script");
  tag.src = SUPABASE_JS;
  tag.onload = () => {
    SB.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    SB.client.auth.onAuthStateChange((_evt, session) => {
      const uid = session?.user?.id || null;
      SB.user = session?.user || null;
      if (uid === SB.uid) return;
      SB.uid = uid;
      setTimeout(afterAuth, 0); // don't call Supabase inside its own auth callback
    });
  };
  tag.onerror = () => { toast(t("云端组件加载失败，先用本机记录")); renderStatus(); };
  document.head.appendChild(tag);
  return true;
}
async function afterAuth(){
  if (SB.busy) return; // a join flow is in progress and will call enterFamily itself
  teardownRealtime(); SB.family = null; SB.members = {};
  if (!SB.user) { S.mode = "local"; render(); refreshSettingsIfOpen(); return; }
  const { data, error } = await SB.client.from("family_members").select("family_id, families(*)").eq("user_id", SB.user.id).limit(1);
  if (error) { toast(t("连接云端失败，先用本机记录")); render(); return; }
  if (data.length && data[0].families) await enterFamily(data[0].families);
  else { S.mode = "local"; render(); refreshSettingsIfOpen(); }
}
async function enterFamily(fam){
  const sync = loadJSON(SYNC_KEY, {});
  if (sync.familyId !== fam.id) {
    // First time this device joins this family: drop demo data, upload everything else once
    S.entries = S.entries.filter(e => !e.demo);
    S.entries.forEach(e => { e._dirty = true; });
    saveTombs([]);
    saveJSON(SYNC_KEY, { familyId: fam.id, lastPull: null });
  } else {
    // Back in the same family (e.g. the invite code entered again after the login lapsed): anything written since
    // the last pull that the server never confirmed (no e.by, which only a push or a pull sets) goes up now. The
    // upsert is idempotent, so a record that did reach the server is simply written once more.
    const since = sync.lastPull ? Date.parse(sync.lastPull) || 0 : 0;
    S.entries.forEach(e => { if (!e.by && !e.demo && (e.updated || 0) >= since) e._dirty = true; });
  }
  SB.family = fam; S.mode = "family";
  const cloudHasKids = !!(fam.settings && Array.isArray(fam.settings.children) && fam.settings.children.length);
  if (fam.settings && Object.keys(fam.settings).length) S.settings = { ...S.settings, ...fam.settings };
  normalizeSettings();
  // Publish the child list the first time any device upgrades, so every device agrees on child ids
  if (!cloudHasKids) await SB.client.from("families").update({ settings: JSON.parse(JSON.stringify(S.settings)) }).eq("id", fam.id);
  saveLocal();
  await loadMembers();
  SB.vis = !(await SB.client.from("entries").select("visibility").limit(1)).error; // migration 012 applied?
  SB.forceReconcile = true; // a fresh start checks that no record this member lost access to is still cached
  await syncNow();
  setupRealtime();
  render(); refreshSettingsIfOpen();
  runScheduled();   // 定时备份到期了就在后台做一次
}
// This device was removed from the family (or the family is gone): drop the local copy, like logging out
function leaveFamily(msg){
  teardownRealtime(); SB.family = null; SB.members = {};
  S.entries = []; saveTombs([]); saveJSON(SYNC_KEY, {}); saveLocal();
  S.mode = "local"; if (msg) toast(msg); render(); refreshSettingsIfOpen();
}
async function loadMembers(){
  const { data, error } = await SB.client.from("family_members").select("user_id, display_name, role").eq("family_id", SB.family.id);
  if (error) return;
  SB.members = Object.fromEntries((data || []).map(m => [m.user_id, { name: m.display_name || t("家人"), role: m.role || "member" }]));
  if (SB.user && !SB.members[SB.user.id]) leaveFamily(t("你已不在这个家庭里，这台设备上的家庭记录副本已清除"));
}
function toRow(e){
  const row = { family_id: SB.family.id, id: e.id, type: e.type, ts: e.ts, updated: e.updated || Date.now(), deleted: false, data: clean(e) };
  if (SB.vis) { row.visibility = e.vis || "family"; row.shared_with = row.visibility === "shared" ? (e.with || []) : []; }
  return row;
}
function applyRow(r){
  const i = S.entries.findIndex(x => x.id === r.id);
  if (i >= 0 && S.entries[i]._dirty) return; // local unsent edit wins until it is pushed
  if (r.deleted) { if (i >= 0) S.entries.splice(i, 1); return; }
  const e = { ...r.data, id: r.id, type: r.type, ts: Number(r.ts), updated: Number(r.updated), by: r.updated_by, cby: r.created_by };
  if (r.visibility && r.visibility !== "family") { e.vis = r.visibility; e.with = r.shared_with || []; }
  if (i >= 0) S.entries[i] = e; else S.entries.push(e);
}
/* ---- visibility helpers ---- */
const visSupported = () => S.mode === "family" && SB.vis && !!SB.user;
// private / shared records can only be changed by their author (the server refuses anyone else); family-wide ones by any member
const canEdit = e => !e.vis || !SB.user || !e.cby || e.cby === SB.user.id;
const otherMembers = () => Object.entries(SB.members).filter(([uid]) => !SB.user || uid !== SB.user.id).map(([id, m]) => ({ id, name: m.name }));
/* A record made private (or un-shared) after this device pulled it stays in the local copy: the server only
   stops returning it. Compare with what the server still shows this member and drop the rest. The candidates
   are re-checked by id, so a record missed while paging is never dropped by mistake. */
async function reconcile(){
  const seen = new Set(); let from = 0;
  for (;;) {
    const { data, error } = await SB.client.from("entries").select("id").eq("family_id", SB.family.id).eq("deleted", false).order("id").range(from, from + 999);
    if (error) throw error;
    data.forEach(r => seen.add(r.id));
    if (data.length < 1000) break; from += 1000;
  }
  const missing = S.entries.filter(e => !e._dirty && !seen.has(e.id)).map(e => e.id);
  const alive = new Set();
  for (let i = 0; i < missing.length; i += 100) {
    const { data, error } = await SB.client.from("entries").select("id").eq("family_id", SB.family.id).eq("deleted", false).in("id", missing.slice(i, i + 100));
    if (error) throw error;
    data.forEach(r => alive.add(r.id));
  }
  const gone = new Set(missing.filter(id => !alive.has(id)));
  if (gone.size) S.entries = S.entries.filter(e => !gone.has(e.id));
  SB.reconciledAt = Date.now();
}
/* One refused row must not stall the device. A write the server turns down (row-level security: deleting or
   editing someone else's private / shared record) used to abort the whole sync, so the device never pushed the
   rest nor pulled anyone else's records again. Now a failed batch is retried row by row, a refused change is
   reverted to the server's version, and the pull runs regardless. A sync that never returns (a request lost on a
   flaky mobile network) is treated as stale after 45 s so the next one can start. */
const STALE_MS = 45e3;
const rlsRefused = err => !!(err && (err.code === "42501" || /row-level security/i.test(err.message || "")));
const connectivity = err => !(err && (err.code || err.details)); // a PostgREST error carries a code; a lost request does not
async function pushRows(rows){
  const refused = [];
  for (let i = 0; i < rows.length; i += 200) {
    const slice = rows.slice(i, i + 200);
    const { error } = await SB.client.from("entries").upsert(slice, { onConflict: "family_id,id" });
    if (!error) continue;
    if (connectivity(error)) throw error;
    for (const row of slice) { // find the refused row(s); the rest still go through
      const r = await SB.client.from("entries").upsert([row], { onConflict: "family_id,id" });
      if (r.error) { if (rlsRefused(r.error)) refused.push(row.id); else throw r.error; }
    }
  }
  return refused;
}
// a refused change: the server's copy wins. Still visible there → take it back; not visible → this member has no business keeping it
async function revert(ids){
  const { data, error } = await SB.client.from("entries").select("*").eq("family_id", SB.family.id).in("id", ids);
  if (error) throw error;
  const seen = new Set();
  for (const r of data) { seen.add(r.id); const e = S.entries.find(x => x.id === r.id); if (e) delete e._dirty; applyRow(r); }
  S.entries = S.entries.filter(e => !(ids.includes(e.id) && !seen.has(e.id)));
}
async function syncNow(force){
  if (!SB.family) return;
  if (force) SB.forceReconcile = true;
  if (SB.syncing && Date.now() - SB.syncStarted < STALE_MS) { SB.again = true; return; }
  const run = ++SB.runId; SB.syncing = true; SB.syncStarted = Date.now();
  try {
    // 0) still a member? RLS makes a removed member's reads come back empty rather than fail, so ask explicitly
    await loadMembers(); if (!SB.family) return;
    // 1) push local changes and deletions; a row the server refuses is reverted instead of blocking everything else
    const dirty = S.entries.filter(e => e._dirty), tombs = loadTombs();
    const rows = dirty.map(toRow).concat(tombs.map(t => ({ family_id: SB.family.id, id: t.id, type: t.type || "deleted", ts: t.ts || 0, updated: Date.now(), deleted: true, data: {} })));
    const refused = await pushRows(rows), bad = new Set(refused);
    dirty.forEach(e => { if (!bad.has(e.id)) { delete e._dirty; e.by = SB.user.id; } }); saveTombs([]);
    if (refused.length) { await revert(refused); toast(t("有 {n} 条改动云端不允许保存（别人的私密或分享记录），已恢复为云端版本", { n: refused.length })); }
    // 2) pull everything changed on the server since last pull (server clock, not phone clock)
    const sync = loadJSON(SYNC_KEY, {});
    let from = 0, newest = sync.lastPull;
    for (;;) {
      let q = SB.client.from("entries").select("*").eq("family_id", SB.family.id).order("server_updated", { ascending: true }).range(from, from + 999);
      if (sync.lastPull) q = q.gte("server_updated", sync.lastPull);
      const { data, error } = await q; if (error) throw error;
      data.forEach(applyRow);
      if (data.length) newest = data[data.length - 1].server_updated;
      if (data.length < 1000) break; from += 1000;
    }
    saveJSON(SYNC_KEY, { familyId: SB.family.id, lastPull: newest });
    // 3) drop cached records this member can no longer see (only when visibility exists, at most every 5 minutes)
    if (SB.vis && (SB.forceReconcile || Date.now() - SB.reconciledAt > 5 * 60e3)) { SB.forceReconcile = false; await reconcile(); }
    // 4) realtime drops quietly while the phone sleeps; bring it back if it is no longer subscribed
    if (SB.channel && !["joined", "joining"].includes(SB.channel.state)) setupRealtime();
    saveLocal(); render();
  } catch (err) {
    renderStatus(); // unsent records stay marked and retry on the next sync
    if (navigator.onLine && SB.family) loadMembers(); // a write refused by RLS usually means this member was removed
  } finally {
    if (SB.runId === run) { // a stale run that finally returns must not clear the flag of the one that replaced it
      SB.syncing = false;
      if (SB.again) { SB.again = false; syncNow(); }
    }
  }
}
function setupRealtime(){
  teardownRealtime();
  SB.channel = SB.client.channel("family-" + SB.family.id)
    .on("postgres_changes", { event: "*", schema: "public", table: "entries", filter: "family_id=eq." + SB.family.id }, payload => {
      if (payload.new && payload.new.id) { applyRow(payload.new); saveLocal(); if (!$("#sheet").open) render(); else renderStatus(); }
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "families", filter: "id=eq." + SB.family.id }, payload => {
      if (!payload.new) return;
      if (payload.new.invite_code && SB.family) SB.family.invite_code = payload.new.invite_code; // reset by an owner on another device
      if (payload.new.settings) { S.settings = { ...S.settings, ...payload.new.settings }; normalizeSettings(); saveLocal(); }
      if (!$("#sheet").open) render(); else refreshSettingsIfOpen();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "family_members", filter: "family_id=eq." + SB.family.id }, () => {
      loadMembers().then(() => { renderStatus(); refreshSettingsIfOpen(); });
    })
    .subscribe();
}
function teardownRealtime(){ if (SB.channel && SB.client) { SB.client.removeChannel(SB.channel); SB.channel = null; } }

/* ---- email account: only needed to create a family ---- */
async function sbAuth(kind){
  const email = $("#sb_email")?.value.trim(), password = $("#sb_pw")?.value || "";
  if (!email || password.length < 6) { toast(t("请填写邮箱和至少 6 位的密码")); return; }
  if (kind === "signup") {
    const { data, error } = await SB.client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) { toast(/registered/i.test(error.message) ? t("这个邮箱已注册，直接登录") : t("注册失败：{e}", { e: error.message })); return; }
    if (!data.session) toast(t("已注册。请先到邮箱点确认链接，再回来登录"));
    else toast(t("注册成功"));
  } else {
    const { error } = await SB.client.auth.signInWithPassword({ email, password });
    toast(error ? t("登录失败：邮箱或密码不对") : t("已登录"));
  }
}
function confirmMerge(){
  const merging = S.entries.filter(e => !e.demo).length;
  return !merging || confirm(t("本机已有 {n} 条记录，会合并进家庭，所有成员都能看到。继续吗？", { n: merging }));
}
async function sbCreate(){
  if (!SB.user || isAnon()) { toast(t("创建家庭需要先用邮箱登录")); return; }
  if (!confirmMerge()) return;
  const display = $("#sb_display")?.value.trim() || t("家人");
  const { data, error } = await SB.client.rpc("create_family", { p_name: (child().name ? t("{name}家", { name: child().name }) : t("我们家")), p_display: display });
  if (error || !data) { toast(t("创建失败，请稍后再试")); return; }
  toast(t("家庭已创建，把邀请码发给家人吧"));
  await enterFamily(Array.isArray(data) ? data[0] : data);
}
/* ---- invite code: no account needed; the device gets an anonymous user that is tied to the family ---- */
async function sbJoin(){
  const code = ($("#sb_code")?.value || "").trim(), display = $("#sb_display")?.value.trim() || t("家人");
  if (!code) { toast(t("请输入邀请码")); return; }
  if (!confirmMerge()) return;
  SB.busy = true;
  try {
    let fresh = false;
    if (!SB.user) {
      const { error } = await SB.client.auth.signInAnonymously();
      if (error) { toast(/anonymous/i.test(error.message) ? t("云端还没有开启“免注册加入”，请家庭创建者在 Supabase 后台打开 Anonymous sign-ins") : t("连接云端失败，请稍后再试")); return; }
      fresh = true;
    }
    const { data, error } = await SB.client.rpc("join_family", { p_code: code, p_display: display });
    if (error || !data) {
      toast(t("邀请码不对，请核对后再试"));
      if (fresh) { SB.busy = false; await SB.client.auth.signOut(); } // don't leave a dangling anonymous login behind
      return;
    }
    toast(t("已加入家庭"));
    SB.busy = false;
    await enterFamily(Array.isArray(data) ? data[0] : data);
  } finally { SB.busy = false; }
}
async function sbLogout(){
  const msg = isAnon() ? t("这台设备是用邀请码加入的。退出后本机的家庭记录副本会被清除（云端数据不受影响），以后再输一次邀请码就能回来。继续吗？")
                       : t("退出后，这台设备上的家庭记录副本会被清除（云端数据不受影响）。继续吗？");
  if (!confirm(msg)) return;
  await SB.client.auth.signOut();
  S.entries = []; saveTombs([]); saveJSON(SYNC_KEY, {}); saveLocal();
  toast(t("已退出")); render(); refreshSettingsIfOpen();
}
/* ---- owner actions ---- */
async function sbResetCode(){
  if (!isOwner() || !confirm(t("重置后旧邀请码立即失效，已加入的家人不受影响。继续吗？"))) return;
  const { data, error } = await SB.client.rpc("reset_invite_code", { p_family: SB.family.id });
  if (error || !data) { toast(t("操作失败，请稍后再试")); return; }
  SB.family = { ...SB.family, ...(Array.isArray(data) ? data[0] : data) };
  toast(t("邀请码已重置")); refreshSettingsIfOpen();
}
async function sbMember(action, uid){
  const me = SB.user.id;
  if (!SB.members[uid]) return;
  if (!(isOwner() || (action === "rename" && uid === me))) return; // members may only rename themselves
  const name = memberName(uid);
  let call;
  if (action === "rename") {
    const next = prompt(t("{name} 的新称呼", { name }), name); if (next == null) return;
    const v = next.trim(); if (!v || v === name) return;
    call = SB.client.rpc("set_member_name", { p_family: SB.family.id, p_user: uid, p_name: v });
  } else if (action === "remove") {
    if (!confirm(t("把 {name} 移出家庭？对方设备上的家庭记录副本会被清除；已写的记录保留。如果不想让对方再加入，之后请重置邀请码。", { name }))) return;
    call = SB.client.rpc("remove_member", { p_family: SB.family.id, p_user: uid });
  } else {
    const role = action === "promote" ? "owner" : "member";
    if (action === "promote" && !confirm(t("把 {name} 设为家主？家主可以重置邀请码、管理成员。", { name }))) return;
    call = SB.client.rpc("set_member_role", { p_family: SB.family.id, p_user: uid, p_role: role });
  }
  const { error } = await call;
  if (error) { toast(/last owner/.test(error.message) ? t("家庭至少要保留一位家主") : t("操作失败，请稍后再试")); return; }
  await loadMembers(); toast(action === "remove" ? t("已移除") : t("已更新")); refreshSettingsIfOpen();
}

function familyHTML(){
  if (!SB.configured) return `<p class="small muted">${t("还没有连接云端。按部署说明在 js/config.js 里填好 Supabase 地址和 key 后，这里就能登录，邀请家人一起记录。")}</p>`;
  if (!SB.client) return `<p class="small muted">${t("云端组件还在加载或加载失败。请检查网络后刷新页面。")}</p>`;
  const joinForm = `
    <div class="field"><label for="sb_display">${t("你在家里的称呼")}</label><input id="sb_display" type="text" placeholder="${t("妈妈 / 爸爸 / 外婆")}"></div>
    <div class="field"><label for="sb_code">${t("邀请码")}</label><input id="sb_code" type="text" autocapitalize="characters" autocomplete="off"></div>
    <div class="btns"><button class="btn primary" data-act="sb-join">${t("用邀请码加入")}</button></div>`;
  if (!SB.user) return `
    ${lapsed() ? `<p class="small" style="color:var(--rose)">${t("这台设备之前加入过家庭，但登录已失效（可能是手机清理了网站数据，或登录过期）。再输一次邀请码就能回来，这期间记的内容会一并上传。")}</p>` : ""}
    <p class="small muted">${t("家人已经建好家庭？输入对方发给你的邀请码就能一起记录，不用注册。")}</p>
    ${joinForm}
    <details style="margin-top:14px"><summary class="small">${t("我要创建新家庭，或用邮箱登录")}</summary>
      <p class="small muted" style="margin-top:8px">${t("第一位建立家庭的人用邮箱注册（只用来在新手机上找回家庭），成为家主；其他家人用邀请码加入即可。")}</p>
      <div class="field"><label for="sb_email">${t("邮箱")}</label><input id="sb_email" type="text" inputmode="email" autocomplete="email"></div>
      <div class="field"><label for="sb_pw">${t("密码（至少 6 位）")}</label><input id="sb_pw" type="password" autocomplete="current-password"></div>
      <div class="btns"><button class="btn" data-act="sb-login">${t("登录")}</button><button class="btn" data-act="sb-signup">${t("注册新账号")}</button></div>
    </details>`;
  if (!SB.family) {
    if (isAnon()) return `<p class="small muted">${t("这台设备还没有加入家庭。输入家人发给你的邀请码。")}</p>${joinForm}
      <div class="btns"><button class="btn" data-act="sb-logout">${t("退出登录")}</button></div>`;
    return `
    <p class="small muted">${t("已登录 {email}。创建一个家庭，或者输入家人发给你的邀请码。", { email: esc(SB.user.email) })}</p>
    <div class="field"><label for="sb_display">${t("你在家里的称呼")}</label><input id="sb_display" type="text" placeholder="${t("妈妈 / 爸爸 / 外婆")}"></div>
    <div class="btns"><button class="btn primary" data-act="sb-create">${t("创建家庭")}</button></div>
    <div class="field"><label for="sb_code">${t("或者输入邀请码")}</label><input id="sb_code" type="text" autocapitalize="characters" autocomplete="off"></div>
    <div class="btns"><button class="btn" data-act="sb-join">${t("加入家庭")}</button><button class="btn" data-act="sb-logout">${t("退出登录")}</button></div>`;
  }
  const owner = isOwner(), me = SB.user.id;
  const rows = Object.entries(SB.members).map(([uid, m]) => {
    const btn = (act, label, style = "") => `<button class="chip" data-member="${act}" data-uid="${esc(uid)}"${style}>${label}</button>`;
    const btns = [];
    if (owner || uid === me) btns.push(btn("rename", t("改称呼")));
    if (owner && uid !== me) btns.push(m.role === "owner" ? btn("demote", t("转为成员")) : btn("promote", t("设为家主")), btn("remove", t("移除"), ' style="color:var(--rose)"'));
    return `<div class="medrow"><div><b>${esc(m.name)}</b>${uid === me ? ` <span class="small muted">${t("（你）")}</span>` : ""}${m.role === "owner" ? ` <span class="pill ok">${t("家主")}</span>` : ""}</div>
      ${btns.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${btns.join("")}</div>` : ""}</div>`;
  }).join("");
  return `
    <p class="small muted" style="margin-bottom:0">${t("家庭成员")}</p>
    <div class="panel" style="padding:0 14px">${rows}</div>
    <p style="margin-top:12px">${t("邀请码")} <b class="num" style="font-size:20px;letter-spacing:.12em">${esc(SB.family.invite_code)}</b> <button class="chip" data-copy="${esc(SB.family.invite_code)}">${t("复制")}</button>${owner ? ` <button class="chip" data-act="sb-reset-code">${t("重置邀请码")}</button>` : ""}</p>
    <p class="small muted">${t("把网址和邀请码发给家人：对方打开网页，在设置里输入邀请码就能一起记录，不需要注册。邀请码相当于家门钥匙，只发给信任的人。")}</p>
    ${isAnon() ? `<p class="small muted">${t("这台设备是用邀请码加入的，没有绑定邮箱。换手机或清理浏览器数据后，再输一次邀请码即可。")}</p>` : ""}
    ${owner ? `<p class="small muted">${t("你是家主：可以重置邀请码、修改家人的称呼、把家人设为家主或移出家庭（比如有人误加入）。")}</p>` : ""}
    <div class="btns"><button class="btn" data-act="sb-sync">${t("立即同步")}</button><button class="btn" data-act="sb-logout">${t("退出登录")}</button></div>`;
}

export { SB, SYNC_KEY, TOMB_KEY, loadJSON, saveJSON, loadTombs, saveTombs, isAnon, isOwner, lapsed, memberName, memberNames, visSupported, canEdit, otherMembers, reconcile, initSupabase, afterAuth, enterFamily, leaveFamily, loadMembers, toRow, applyRow, syncNow, setupRealtime, teardownRealtime, sbAuth, sbCreate, sbJoin, sbLogout, sbResetCode, sbMember, familyHTML };
