import { t } from "./i18n.js";
import { S, ageMonths } from "./state.js";
import { SB } from "./sync.js";
import { esc, toast } from "./util.js";

/* ============ 音乐卡（11-07）：今天页顶部滑动卡片的最后一张 ============
   两种声音：
   ① 宝宝声音：白噪音、粉红噪音、棕色噪音、嘘声、心跳。第一次放时在手机上合成一段 20 秒能无缝循环的音频（WAV，存在内存里），
      再用普通的 <audio> 循环播放——和放歌一样，锁屏 / 关屏后照样在放，锁屏上也有播放 / 暂停。不用下载、离线也能放。1 岁以下默认这一类。
   ② 家庭学堂的歌：同一个家庭在家庭学堂「全部歌曲」里上传的 MP3（hs_bedtime_songs + media 桶，只读）；
      两个网站同源，音频缓存共用家庭学堂的 IndexedDB（homeschool-media），那边下载过这边直接能放。
   控制：播放 / 暂停、上一首 / 下一首（宝宝声音时是换声音）、选歌、拖动进度条、循环（歌单 / 单曲 / 播完就停）、音量、定时关（最后 10 秒变小）。
   宝宝睡着时：睡眠卡里只放一行小控件（选声音 + 播放 + 定时），不再在下面摆一整张卡，睡眠计时还是最显眼的。
   注意：iPhone 上网页不能改音量（只能用手机侧面的音量键），音量条在 iPhone 上不起作用。 */
const K = { vol: "baby.music.vol", loop: "baby.music.loop", src: "baby.music.src", sound: "baby.music.sound", songs: "baby.music.songs" };
const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } };
const put = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* 忽略 */ } };

export const SOUNDS = [["white", "白噪音", "🌫️"], ["pink", "粉红噪音", "🌸"], ["brown", "棕色噪音", "🌊"], ["shush", "嘘声", "🤫"], ["heart", "心跳", "💓"]];
const soundOf = (k) => SOUNDS.find(([x]) => x === k) || SOUNDS[0];
const M = {
  src: get(K.src, "") || null,
  sound: SOUNDS.some(([k]) => k === get(K.sound, "")) ? get(K.sound, "") : "white",
  songs: (() => { try { return JSON.parse(get(K.songs, "[]")) || []; } catch { return []; } })(), songsAt: 0, songsLoading: false,
  i: 0, kind: "", audio: null, url: null, playing: false, loading: false,
  loop: ["list", "one", "off"].includes(get(K.loop, "list")) ? get(K.loop, "list") : "list",
  vol: Math.min(1, Math.max(0, +get(K.vol, "0.6") || 0.6)),
  timerEnd: 0, timerMin: 0, timerTick: 0,
};
const srcNow = () => M.src || (ageMonths() != null && ageMonths() < 12 ? "sound" : M.songs.length ? "song" : "sound");

/* ---- 家庭学堂的歌 ---- */
async function loadSongs(force = false){
  if (M.songsLoading || !SB.client || !SB.family || (!force && Date.now() - M.songsAt < 10 * 60e3)) return;
  M.songsLoading = true;
  try {
    const { data, error } = await SB.client.from("hs_bedtime_songs").select("id,title,artist,path,duration,sort").eq("family_id", SB.family.id).order("sort").order("id");
    if (!error) { M.songs = (data || []).filter((s) => s.path); M.songsAt = Date.now(); put(K.songs, JSON.stringify(M.songs)); }
  } catch { /* 没网：用上次记下的 */ }
  M.songsLoading = false; repaint();
}
const MDB = "homeschool-media";
const mdb = () => new Promise((res, rej) => { const r = indexedDB.open(MDB, 1); r.onupgradeneeded = () => r.result.createObjectStore("songs"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function mGet(k){ try { const db = await mdb(); return await new Promise((res) => { const q = db.transaction("songs").objectStore("songs").get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); } catch { return null; } }
async function mSet(k, v){ try { const db = await mdb(); await new Promise((res) => { const tx = db.transaction("songs", "readwrite"); tx.objectStore("songs").put(v, k); tx.oncomplete = res; tx.onerror = res; }); } catch { /* 存不下就每次下载 */ } }
async function songBlob(s){
  const hit = await mGet(s.id); if (hit && hit.blob && hit.path === s.path) return hit.blob;
  if (!SB.client || !navigator.onLine) throw new Error(t("这首歌还没下载到这台设备，联网后再放"));
  const { data, error } = await SB.client.storage.from("media").download(s.path);
  if (error) throw new Error(t("下载失败：") + (error.message || ""));
  await mSet(s.id, { blob: data, path: s.path }); return data;
}

/* ---- 宝宝声音：合成一段能无缝循环的 WAV（22.05 kHz、单声道、16 位） ---- */
const RATE = 22050, soundUrls = {};
function synth(kind){
  const secs = kind === "heart" ? 20.4 : 20, n = Math.round(RATE * secs), d = new Float32Array(n);   // 心跳每 0.85 秒一次，20.4 秒正好 24 次；嘘声起伏 0.35 Hz，20 秒正好 7 次
  if (kind === "heart") {
    const thump = (at, f, v) => { const s0 = Math.round(at * RATE), len = Math.round(0.2 * RATE); for (let i = 0; i < len && s0 + i < n; i++) { const tt = i / RATE, env = tt < 0.02 ? tt / 0.02 : Math.exp(-(tt - 0.02) * 26); d[s0 + i] += Math.sin(2 * Math.PI * f * tt) * env * v; } };
    for (let b = 0; b < 24; b++) { thump(b * 0.85, 60, 0.9); thump(b * 0.85 + 0.28, 52, 0.6); }
  } else {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    // 嘘声：带通（中心 2.5 kHz）+ 音量慢慢起伏
    const w0 = 2 * Math.PI * 2500 / RATE, al = Math.sin(w0) / (2 * 0.9), a0 = 1 + al, bb0 = al / a0, bb2 = -al / a0, aa1 = -2 * Math.cos(w0) / a0, aa2 = (1 - al) / a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "pink") { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.09; b6 = w * 0.115926; }
      else if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3; }
      else if (kind === "shush") { const y = bb0 * w + bb2 * x2 - aa1 * y1 - aa2 * y2; x2 = x1; x1 = w; y2 = y1; y1 = y; d[i] = y * 1.4 * (0.6 + 0.35 * Math.sin(2 * Math.PI * 0.35 * i / RATE)); }
      else d[i] = w * 0.32;
    }
  }
  // 头尾 30 毫秒交叉淡入淡出，循环接口听不出来
  const fade = Math.round(0.03 * RATE); for (let i = 0; i < fade; i++) { const k = i / fade; d[i] = d[i] * k + d[n - fade + i] * (1 - k); }
  const out = d.subarray(0, n - fade), buf = new ArrayBuffer(44 + out.length * 2), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + out.length * 2, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, out.length * 2, true);
  for (let i = 0; i < out.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, out[i])) * 0x7fff, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
const soundUrl = (k) => (soundUrls[k] ||= synth(k));

/* ---- 播放控制（宝宝声音和歌都用同一个 <audio>，关屏也能放） ---- */
function release(){ if (M.audio) { try { M.audio.pause(); M.audio.ontimeupdate = M.audio.onended = M.audio.onplay = M.audio.onpause = M.audio.onloadedmetadata = null; M.audio.removeAttribute("src"); M.audio.load(); } catch { /* 忽略 */ } } if (M.url) URL.revokeObjectURL(M.url); M.audio = M.url = null; M.playing = false; M.kind = ""; }
function stopAll(){ release(); clearTimer(); repaint(); }
function wire(a){ a.onplay = () => { M.playing = true; sync(); }; a.onpause = () => { M.playing = false; sync(); }; }
async function playSound(k){
  release(); M.sound = k; put(K.sound, k);
  const a = new Audio(); a.src = soundUrl(k); a.loop = true; a.volume = M.vol; M.audio = a; M.kind = "sound"; wire(a);
  try { await a.play(); } catch (e) { toast(e.message || t("播放失败")); }
  meta(); repaint();
}
async function playSong(i){
  const s = M.songs[i]; if (!s) return;
  release(); M.i = i; M.loading = true; M.kind = "song"; repaint();
  try {
    const blob = await songBlob(s); if (M.songs[M.i] !== s || M.kind !== "song") return;
    const a = new Audio(); M.url = URL.createObjectURL(blob); a.src = M.url; a.volume = M.vol; M.audio = a; M.kind = "song";
    a.ontimeupdate = tick; a.onloadedmetadata = tick; a.onended = advance; wire(a);
    await a.play();
  } catch (e) { toast(e.message || t("播放失败")); }
  M.loading = false; meta(); repaint();
}
function advance(){
  if (M.loop === "one" && M.audio) { M.audio.currentTime = 0; M.audio.play().catch(() => {}); return; }
  const n = M.i + 1 < M.songs.length ? M.i + 1 : M.loop === "list" ? 0 : -1;
  if (n < 0) { M.playing = false; repaint(); return; }
  playSong(n);
}
async function toggle(){
  const want = srcNow();
  if (M.audio && M.kind === want) { if (M.audio.paused) await M.audio.play().catch((e) => toast(e.message)); else M.audio.pause(); return; }
  if (want === "sound") await playSound(M.sound); else if (M.songs.length) await playSong(M.i);
}
function step(d){
  if (srcNow() === "sound") { const k = SOUNDS.findIndex(([x]) => x === M.sound); pickSound(SOUNDS[(k + d + SOUNDS.length) % SOUNDS.length][0]); return; }
  if (!M.songs.length) return;
  if (d < 0 && M.audio && M.audio.currentTime > 3) { M.audio.currentTime = 0; return; }
  playSong((M.i + d + M.songs.length) % M.songs.length);
}
function pickSound(k){ M.sound = k; put(K.sound, k); if (M.playing && M.kind === "sound") playSound(k); else repaint(); }
function setSrc(src){ if (src === srcNow()) return; release(); clearTimer(); M.src = src; put(K.src, src); if (src === "song") loadSongs(); repaint(); }
function setVol(v){ M.vol = Math.max(0, Math.min(1, v)); put(K.vol, M.vol); if (M.audio) M.audio.volume = M.vol; }
function cycleLoop(){ M.loop = M.loop === "list" ? "one" : M.loop === "one" ? "off" : "list"; put(K.loop, M.loop); sync(); }
function clearTimer(){ clearInterval(M.timerTick); M.timerTick = 0; M.timerEnd = 0; M.timerMin = 0; }
function setTimer(min){
  clearTimer(); if (!min) { repaint(); return; }
  M.timerMin = min; M.timerEnd = Date.now() + min * 60e3;
  M.timerTick = setInterval(() => {
    const left = M.timerEnd - Date.now();
    if (left <= 10e3 && left > 0 && M.audio) M.audio.volume = M.vol * (left / 10e3);   // 最后 10 秒慢慢变小（iPhone 上直接停）
    if (left <= 0) { stopAll(); return; }
    document.querySelectorAll(".bm-timer-left").forEach((el) => { el.textContent = mmss(left / 1000); });
  }, 1000);
  repaint();
}
function meta(){
  if (!("mediaSession" in navigator)) return;
  try {
    const s = M.kind === "song" ? M.songs[M.i] : null, snd = soundOf(M.sound);
    navigator.mediaSession.metadata = new MediaMetadata({ title: s ? s.title : t(snd[1]), artist: s ? s.artist || "" : t("宝宝声音"), album: t("小月亮") });
    navigator.mediaSession.setActionHandler("play", () => toggle()); navigator.mediaSession.setActionHandler("pause", () => toggle());
    navigator.mediaSession.setActionHandler("nexttrack", () => step(1)); navigator.mediaSession.setActionHandler("previoustrack", () => step(-1));
  } catch { /* 忽略 */ }
}

/* ---- 图标（SVG，跟着按钮颜色；文字 ▶ 在一些手机上会变成彩色 emoji） ---- */
const sv = (body, stroke = false) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"${stroke ? ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' : ' fill="currentColor"'}>${body}</svg>`;
const ICON = {
  play: sv('<path d="M8 5.2v13.6L19 12z"/>'), pause: sv('<path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.4z"/>'),
  prev: sv('<path d="M6 5h2.2v14H6zM19.5 5.4v13.2L9.6 12z"/>'), next: sv('<path d="M15.8 5H18v14h-2.2zM4.5 5.4v13.2L14.4 12z"/>'),
  list: sv('<path d="M17 2.5l3 3-3 3M4 11V9.5a4 4 0 0 1 4-4h12M7 21.5l-3-3 3-3M20 13v1.5a4 4 0 0 1-4 4H4"/>', true),
  one: sv('<path d="M17 2.5l3 3-3 3M4 11V9.5a4 4 0 0 1 4-4h12M7 21.5l-3-3 3-3M20 13v1.5a4 4 0 0 1-4 4H4M11.2 10.6l1.6-1.1v5"/>', true),
  off: sv('<path d="M4 12h12.5M12.5 7l5 5-5 5M20.5 6v12"/>', true),
  vol: sv('<path d="M4 9.2v5.6h3.6L12.5 19V5L7.6 9.2z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  timer: sv('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 2M9.5 2.5h5"/>', true),
  load: sv('<circle cx="12" cy="12" r="7.5" stroke-dasharray="30 18"/>', true),
};
const LOOPS = { list: ["list", "歌单循环"], one: ["one", "单曲循环"], off: ["off", "播完就停"] };
const mainIcon = () => (M.loading ? ICON.load : M.playing ? ICON.pause : ICON.play);
const mmss = (s) => (Number.isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");
const btn = (act, label, ico, cls = "", extra = "") => `<button type="button" class="bm-btn ${cls}" data-bm="${act}" ${extra} aria-label="${esc(label)}" title="${esc(label)}">${ico}</button>`;
const timerSel = () => `<label class="bm-timer" title="${esc(t("定时关"))}">${ICON.timer}<select data-bmtimer aria-label="${esc(t("定时关"))}">${[0, 15, 30, 45, 60].map((m) => `<option value="${m}" ${M.timerMin === m ? "selected" : ""}>${m ? t("{n} 分钟", { n: m }) : t("不定时")}</option>`).join("")}</select>${M.timerEnd ? `<span class="bm-timer-left">${mmss((M.timerEnd - Date.now()) / 1000)}</span>` : ""}</label>`;
function repaint(){
  document.querySelectorAll("[data-bmcard]").forEach((el) => { el.outerHTML = musicSlideInner(el.dataset.bmcard === "clone"); });
  document.querySelectorAll("[data-bmmini]").forEach((el) => { el.outerHTML = musicMiniHTML(); });
}

/** 整张音乐卡（clone = 循环轨道里的副本） */
export function musicSlideInner(clone = false){
  if (SB.family && !M.songsAt) loadSongs();
  const src = srcNow(), song = src === "song", s = song ? M.songs[M.i] : null, snd = soundOf(M.sound), live = M.audio && M.kind === src;
  const a = live && song ? M.audio : null, pos = a && a.duration ? (a.currentTime / a.duration) * 100 : 0;
  const seg = `<div class="bm-seg" role="group" aria-label="${esc(t("声音来源"))}"><button type="button" data-bm="src-sound" aria-pressed="${!song}">${t("宝宝声音")}</button><button type="button" data-bm="src-song" aria-pressed="${song}">${t("学堂的歌")}</button></div>`;
  const art = song ? `<span class="bm-art bm-art-song" aria-hidden="true">♪</span>` : `<span class="bm-art" aria-hidden="true">${snd[2]}</span>`;
  const meta = song
    ? (M.songs.length ? `<div class="bm-title">${esc(s?.title || "")}</div><div class="bm-sub">${s?.artist ? `${esc(s.artist)} · ` : ""}${M.i + 1} / ${M.songs.length}</div>`
      : `<div class="bm-title">${t("还没有歌")}</div><div class="bm-sub">${SB.family ? t("在家庭学堂「资源 → 音乐 → 全部歌曲」里上传 MP3，这里就能放") : t("登录家庭后，能放家庭学堂里上传的歌")}</div>`)
    : `<div class="bm-title">${esc(t(snd[1]))}</div><div class="bm-sub">${live && M.playing ? t("正在播放 · 关屏也会继续") : t("手机现场合成，离线也能放")}</div>`;
  const middle = song
    ? (M.songs.length ? `<label class="bm-songsel"><span class="sr-only">${t("选歌")}</span><select data-bmsong aria-label="${esc(t("选歌"))}">${M.songs.map((x, i) => `<option value="${i}" ${i === M.i ? "selected" : ""}>${i + 1}. ${esc(x.title)}</option>`).join("")}</select></label>
      <div class="bm-prog"><span class="bm-cur">${mmss(a?.currentTime || 0)}</span><input class="bm-bar" type="range" min="0" max="100" step="0.1" value="${pos}" style="--p:${pos}%" aria-label="${esc(t("播放进度"))}" ${a ? "" : "disabled"}><span class="bm-dur">${mmss(a?.duration || s?.duration || 0)}</span></div>` : "")
    : `<div class="bm-sounds" role="group" aria-label="${esc(t("选声音"))}">${SOUNDS.map(([k, n, ic]) => `<button type="button" class="bm-snd" data-bm="sound:${k}" aria-pressed="${M.sound === k}"><span aria-hidden="true">${ic}</span><span class="bm-snd-n">${esc(t(n))}</span></button>`).join("")}</div>`;
  const ctrl = `<div class="bm-ctrl">
      ${song ? btn("loop", t(LOOPS[M.loop][1]), ICON[LOOPS[M.loop][0]], `bm-loop ${M.loop === "off" ? "" : "is-on"}`) : `<span class="bm-gap"></span>`}
      ${btn("prev", song ? t("上一首") : t("上一个声音"), ICON.prev)}
      ${btn("toggle", live && M.playing ? t("暂停") : t("播放"), live ? mainIcon() : ICON.play, "bm-main", song && !M.songs.length ? "disabled" : "")}
      ${btn("next", song ? t("下一首") : t("下一个声音"), ICON.next)}
      <span class="bm-gap"></span>
    </div>`;
  return `<div class="bm-card" data-bmcard="${clone ? "clone" : "main"}">
    <div class="bm-top"><span class="bm-ttl">🎶 ${t("音乐")}</span>${seg}</div>
    <div class="bm-now">${art}<div class="bm-meta">${meta}</div></div>
    ${middle}
    ${ctrl}
    <div class="bm-bottom"><label class="bm-vol" title="${esc(t("音量"))}">${ICON.vol}<input type="range" min="0" max="1" step="0.05" value="${M.vol}" data-bmvol aria-label="${esc(t("音量"))}" style="--p:${M.vol * 100}%"></label>${timerSel()}</div>
  </div>`;
}
/** 宝宝睡着时：睡眠卡里一行（选声音 + 播放 / 暂停 + 定时） */
export function musicMiniHTML(){
  const live = M.audio && M.kind === "sound";
  return `<div class="bm-mini" data-bmmini>
    <label class="bm-mini-sel"><span aria-hidden="true">${soundOf(M.sound)[2]}</span><select data-bmsound aria-label="${esc(t("选声音"))}">${SOUNDS.map(([k, n]) => `<option value="${k}" ${M.sound === k ? "selected" : ""}>${esc(t(n))}</option>`).join("")}</select></label>
    <button type="button" class="bm-mini-play" data-bm="mini-toggle" aria-label="${esc(live && M.playing ? t("暂停") : t("播放白噪音"))}">${live && M.playing ? ICON.pause : ICON.play}</button>
    ${timerSel()}
  </div>`;
}
function tick(){
  const a = M.audio; if (!a || M.kind !== "song") return; const pos = a.duration ? (a.currentTime / a.duration) * 100 : 0;
  document.querySelectorAll("[data-bmcard]").forEach((el) => {
    const bar = el.querySelector(".bm-bar"); if (bar && !bar._drag) { bar.value = String(pos); bar.style.setProperty("--p", `${pos}%`); }
    const c = el.querySelector(".bm-cur"); if (c) c.textContent = mmss(a.currentTime);
    const d = el.querySelector(".bm-dur"); if (d && a.duration) d.textContent = mmss(a.duration);
  });
}
function sync(){
  document.querySelectorAll("[data-bmcard]").forEach((el) => {
    const m = el.querySelector(".bm-main"); if (m && M.kind === srcNow()) { m.innerHTML = mainIcon(); m.setAttribute("aria-label", M.playing ? t("暂停") : t("播放")); }
    const lp = el.querySelector(".bm-loop"); if (lp) { lp.innerHTML = ICON[LOOPS[M.loop][0]]; lp.classList.toggle("is-on", M.loop !== "off"); lp.setAttribute("aria-label", t(LOOPS[M.loop][1])); lp.title = t(LOOPS[M.loop][1]); }
  });
  document.querySelectorAll("[data-bmmini] .bm-mini-play").forEach((b) => { const on = M.kind === "sound" && M.playing; b.innerHTML = on ? ICON.pause : ICON.play; b.setAttribute("aria-label", on ? t("暂停") : t("播放白噪音")); });
  tick();
}

/* ---- 事件 ---- */
document.addEventListener("click", async (e) => {
  const b = e.target.closest?.("[data-bm]"); if (!b || b.disabled) return;
  e.preventDefault(); e.stopPropagation();
  const a = b.dataset.bm;
  if (a === "toggle") await toggle();
  else if (a === "mini-toggle") { if (M.audio && M.kind === "sound") { if (M.audio.paused) await M.audio.play().catch((er) => toast(er.message)); else M.audio.pause(); } else await playSound(M.sound); }
  else if (a === "prev") step(-1);
  else if (a === "next") step(1);
  else if (a === "loop") cycleLoop();
  else if (a === "src-sound") setSrc("sound");
  else if (a === "src-song") setSrc("song");
  else if (a.startsWith("sound:")) pickSound(a.slice(6));
}, true);
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.classList?.contains("bm-bar")) { el._drag = true; el.style.setProperty("--p", `${el.value}%`); }
  else if (el.dataset?.bmvol !== undefined) { setVol(+el.value); document.querySelectorAll("[data-bmvol]").forEach((x) => { x.value = el.value; x.style.setProperty("--p", `${el.value * 100}%`); }); }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.classList?.contains("bm-bar")) { el._drag = false; if (M.audio?.duration) M.audio.currentTime = (+el.value / 100) * M.audio.duration; }
  else if (el.dataset?.bmtimer !== undefined) { setTimer(+el.value); toast(+el.value ? t("{n} 分钟后自动停（最后 10 秒慢慢变小）", { n: +el.value }) : t("已取消定时")); }
  else if (el.dataset?.bmsong !== undefined) playSong(+el.value);
  else if (el.dataset?.bmsound !== undefined) { if (M.audio && M.kind === "sound" && M.playing) playSound(el.value); else pickSound(el.value); }
});
