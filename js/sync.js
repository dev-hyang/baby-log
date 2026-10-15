import { SUPABASE_ANON_KEY, SUPABASE_JS, SUPABASE_URL } from "./config.js";
import { last } from "./derived.js";
import { openSettings } from "./sheet.js";
import { LS_KEY, S, child, normalizeSettings, saveLocal } from "./state.js";
import { clean } from "./store.js";
import { trim } from "./units.js";
import { $, esc, num, toast } from "./util.js";
import { render, renderStatus } from "./views.js";

/* ============ Supabase family sync ============ */
const SB = { configured: false, client: null, uid: undefined, user: null, family: null, members: {}, channel: null, syncing: false, again: false };
const SYNC_KEY = LS_KEY + ".sync", TOMB_KEY = LS_KEY + ".tomb";
const loadJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch (e) { return d; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const loadTombs = () => loadJSON(TOMB_KEY, []), saveTombs = v => saveJSON(TOMB_KEY, v);

function initSupabase(){
  const hp = new URLSearchParams(location.hash.slice(1));
  if (hp.get("error_code")) {
    const code = hp.get("error_code");
    setTimeout(() => toast(code === "otp_expired" ? "确认链接已失效：请直接用邮箱和密码登录试试，不行再重新注册" : "登录链接有问题：" + (hp.get("error_description") || code)), 300);
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
  tag.onerror = () => { toast("云端组件加载失败，先用本机记录"); renderStatus(); };
  document.head.appendChild(tag);
  return true;
}
async function afterAuth(){
  teardownRealtime(); SB.family = null; SB.members = {};
  if (!SB.user) { S.mode = "local"; render(); refreshSettingsIfOpen(); return; }
  const { data, error } = await SB.client.from("family_members").select("family_id, families(*)").eq("user_id", SB.user.id).limit(1);
  if (error) { toast("连接云端失败，先用本机记录"); render(); return; }
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
  }
  SB.family = fam; S.mode = "family";
  const cloudHasKids = !!(fam.settings && Array.isArray(fam.settings.children) && fam.settings.children.length);
  if (fam.settings && Object.keys(fam.settings).length) S.settings = { ...S.settings, ...fam.settings };
  normalizeSettings();
  // Publish the child list the first time any device upgrades, so every device agrees on child ids
  if (!cloudHasKids) await SB.client.from("families").update({ settings: JSON.parse(JSON.stringify(S.settings)) }).eq("id", fam.id);
  saveLocal();
  await loadMembers();
  await syncNow();
  setupRealtime();
  render(); refreshSettingsIfOpen();
}
async function loadMembers(){
  const { data } = await SB.client.from("family_members").select("user_id, display_name").eq("family_id", SB.family.id);
  SB.members = Object.fromEntries((data || []).map(m => [m.user_id, m.display_name || "家人"]));
}
function toRow(e){ return { family_id: SB.family.id, id: e.id, type: e.type, ts: e.ts, updated: e.updated || Date.now(), deleted: false, data: clean(e) }; }
function applyRow(r){
  const i = S.entries.findIndex(x => x.id === r.id);
  if (i >= 0 && S.entries[i]._dirty) return; // local unsent edit wins until it is pushed
  if (r.deleted) { if (i >= 0) S.entries.splice(i, 1); return; }
  const e = { ...r.data, id: r.id, type: r.type, ts: Number(r.ts), updated: Number(r.updated), by: r.updated_by };
  if (i >= 0) S.entries[i] = e; else S.entries.push(e);
}
async function syncNow(){
  if (!SB.family) return;
  if (SB.syncing) { SB.again = true; return; }
  SB.syncing = true;
  try {
    // 1) push local changes and deletions
    const dirty = S.entries.filter(e => e._dirty), tombs = loadTombs();
    const rows = dirty.map(toRow).concat(tombs.map(t => ({ family_id: SB.family.id, id: t.id, type: t.type || "deleted", ts: t.ts || 0, updated: Date.now(), deleted: true, data: {} })));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await SB.client.from("entries").upsert(rows.slice(i, i + 200), { onConflict: "family_id,id" });
      if (error) throw error;
    }
    dirty.forEach(e => { delete e._dirty; e.by = SB.user.id; }); saveTombs([]);
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
    saveLocal(); render();
  } catch (err) {
    renderStatus(); // unsent records stay marked and retry on the next sync
  } finally {
    SB.syncing = false;
    if (SB.again) { SB.again = false; syncNow(); }
  }
}
function setupRealtime(){
  teardownRealtime();
  SB.channel = SB.client.channel("family-" + SB.family.id)
    .on("postgres_changes", { event: "*", schema: "public", table: "entries", filter: "family_id=eq." + SB.family.id }, payload => {
      if (payload.new && payload.new.id) { applyRow(payload.new); saveLocal(); if (!$("#sheet").open) render(); else renderStatus(); }
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "families", filter: "id=eq." + SB.family.id }, payload => {
      if (payload.new?.settings) { S.settings = { ...S.settings, ...payload.new.settings }; normalizeSettings(); saveLocal(); if (!$("#sheet").open) render(); }
    })
    .subscribe();
}
function teardownRealtime(){ if (SB.channel && SB.client) { SB.client.removeChannel(SB.channel); SB.channel = null; } }
function refreshSettingsIfOpen(){ if ($("#sheet").open && $("#kidRows")) openSettings(); }

async function sbAuth(kind){
  const email = $("#sb_email")?.value.trim(), password = $("#sb_pw")?.value || "";
  if (!email || password.length < 6) { toast("请填写邮箱和至少 6 位的密码"); return; }
  if (kind === "signup") {
    const { data, error } = await SB.client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) { toast("注册失败：" + (/registered/i.test(error.message) ? "这个邮箱已注册，直接登录" : error.message)); return; }
    if (!data.session) toast("已注册。请先到邮箱点确认链接，再回来登录");
    else toast("注册成功");
  } else {
    const { error } = await SB.client.auth.signInWithPassword({ email, password });
    toast(error ? "登录失败：邮箱或密码不对" : "已登录");
  }
}
async function sbFamily(kind){
  const display = $("#sb_display")?.value.trim() || "家人";
  const merging = S.entries.filter(e => !e.demo).length;
  if (merging && !confirm(`本机已有 ${merging} 条记录，会合并进家庭，所有成员都能看到。继续吗？`)) return;
  const { data, error } = kind === "create"
    ? await SB.client.rpc("create_family", { p_name: (child().name ? child().name + "家" : "我们家"), p_display: display })
    : await SB.client.rpc("join_family", { p_code: $("#sb_code")?.value || "", p_display: display });
  if (error || !data) { toast(kind === "join" ? "邀请码不对，请核对后再试" : "创建失败，请稍后再试"); return; }
  toast(kind === "create" ? "家庭已创建，把邀请码发给家人吧" : "已加入家庭");
  await enterFamily(Array.isArray(data) ? data[0] : data);
}
async function sbLogout(){
  if (!confirm("退出后，这台设备上的家庭记录副本会被清除（云端数据不受影响）。继续吗？")) return;
  await SB.client.auth.signOut();
  S.entries = []; saveTombs([]); saveJSON(SYNC_KEY, {}); saveLocal();
  toast("已退出"); render(); refreshSettingsIfOpen();
}
function familyHTML(){
  if (!SB.configured) return `<p class="small muted">还没有连接云端。按部署说明在 js/config.js 里填好 Supabase 地址和 key 后，这里就能登录，邀请家人一起记录。</p>`;
  if (!SB.client) return `<p class="small muted">云端组件还在加载或加载失败。请检查网络后刷新页面。</p>`;
  if (!SB.user) return `
    <div class="field"><label for="sb_email">邮箱</label><input id="sb_email" type="text" inputmode="email" autocomplete="email"></div>
    <div class="field"><label for="sb_pw">密码（至少 6 位）</label><input id="sb_pw" type="password" autocomplete="current-password"></div>
    <div class="btns"><button class="btn primary" data-act="sb-login">登录</button><button class="btn" data-act="sb-signup">注册新账号</button></div>`;
  if (!SB.family) return `
    <p class="small muted">已登录 ${esc(SB.user.email)}。创建一个家庭，或者输入家人发给你的邀请码。</p>
    <div class="field"><label for="sb_display">你在家里的称呼</label><input id="sb_display" type="text" placeholder="妈妈 / 爸爸 / 外婆"></div>
    <div class="btns"><button class="btn primary" data-act="sb-create">创建家庭</button></div>
    <div class="field"><label for="sb_code">或者输入邀请码</label><input id="sb_code" type="text" autocapitalize="characters" autocomplete="off"></div>
    <div class="btns"><button class="btn" data-act="sb-join">加入家庭</button><button class="btn" data-act="sb-logout">退出登录</button></div>`;
  return `
    <p>家庭成员：${Object.values(SB.members).map(esc).join("、") || "只有你"}</p>
    <p>邀请码 <b class="num" style="font-size:20px;letter-spacing:.12em">${esc(SB.family.invite_code)}</b> <button class="chip" data-copy="${esc(SB.family.invite_code)}">复制</button></p>
    <p class="small muted">把网址和邀请码发给家人：对方注册后，在这里输入邀请码就能一起记录。邀请码相当于家门钥匙，只发给信任的人。</p>
    <div class="btns"><button class="btn" data-act="sb-sync">立即同步</button><button class="btn" data-act="sb-logout">退出登录</button></div>`;
}

export { SB, SYNC_KEY, TOMB_KEY, loadJSON, saveJSON, loadTombs, saveTombs, initSupabase, afterAuth, enterFamily, loadMembers, toRow, applyRow, syncNow, setupRealtime, teardownRealtime, refreshSettingsIfOpen, sbAuth, sbFamily, sbLogout, familyHTML };
