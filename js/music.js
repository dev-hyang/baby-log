import { t } from "./i18n.js";
import { S, ageMonths } from "./state.js";
import { SB } from "./sync.js";
import { esc, toast } from "./util.js";

/* ============ 音乐卡（11-07）：今天页顶部滑动卡片里多一张 ============
   两种声音：
   ① 宝宝声音：白噪音、粉红噪音、棕色噪音（低沉）、嘘声、心跳——在浏览器里现场合成，不用下载、离线也能放；1 岁以下默认这一类。
   ② 家庭学堂的歌：同一个家庭在家庭学堂「全部歌曲」里上传的 MP3（hs_bedtime_songs + media 桶，只读）；
      两个网站同源，音频缓存共用家庭学堂的 IndexedDB（homeschool-media），那边下载过这边直接能放。
   控制：播放 / 暂停、上一首 / 下一首、拖动进度条、循环（🔁 歌单 → 🔂 单曲 → ➡ 播完就停）、音量、定时关（15 / 30 / 45 / 60 分钟，最后 10 秒淡出）。
   一直在：换页、卡片每 30 秒重画都不停；锁屏 / 耳机按键用 Media Session。 */
const K = { vol: "baby.music.vol", loop: "baby.music.loop", src: "baby.music.src", sound: "baby.music.sound", songs: "baby.music.songs" };
const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } };
const put = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* 忽略 */ } };

export const SOUNDS = [["white", "白噪音", "🌫️"], ["pink", "粉红噪音", "🌸"], ["brown", "棕色噪音（低沉）", "🌊"], ["shush", "嘘声", "🤫"], ["heart", "心跳", "💓"]];
const M = {
  src: get(K.src, "") || null,   // "sound" | "song"（没选过：1 岁以下宝宝声音，其余家庭学堂的歌）
  sound: SOUNDS.some(([k]) => k === get(K.sound, "")) ? get(K.sound, "") : "white",
  songs: (() => { try { return JSON.parse(get(K.songs, "[]")) || []; } catch { return []; } })(), songsAt: 0, songsLoading: false,
  i: 0, audio: null, url: null, playing: false, loading: false,
  loop: ["list", "one", "off"].includes(get(K.loop, "list")) ? get(K.loop, "list") : "list",
  vol: Math.min(1, Math.max(0, +get(K.vol, "0.6") || 0.6)),
  ctx: null, gain: null, nodes: [], heartTimer: 0,
  timerEnd: 0, timerMin: 0, timerTick: 0,
};
const srcNow = () => M.src || (ageMonths() != null && ageMonths() < 12 ? "sound" : M.songs.length ? "song" : "sound");

/* ---- 家庭学堂的歌：列表（10 分钟内不重读）+ 音频（共用家庭学堂的缓存） ---- */
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

/* ---- 合成的宝宝声音 ---- */
function ctx(){ if (!M.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; M.ctx = new C(); M.gain = M.ctx.createGain(); M.gain.connect(M.ctx.destination); } M.gain.gain.value = M.vol; return M.ctx; }
function noiseBuffer(c, kind){
  const len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === "pink") { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
    else if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else d[i] = w * 0.5;
  }
  return buf;
}
function stopSound(){
  for (const n of M.nodes) { try { n.stop ? n.stop() : null; n.disconnect(); } catch { /* 忽略 */ } }
  M.nodes = []; clearInterval(M.heartTimer); M.heartTimer = 0;
}
function playSound(kind){
  const c = ctx(); if (!c) return false;
  c.resume?.(); stopSound();
  if (kind === "heart") {   // 心跳：每 0.85 秒「咚-咚」两下低频
    const beat = (t0, f, v) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; o.type = "sine"; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18); o.connect(g).connect(M.gain); o.start(t0); o.stop(t0 + 0.2); };
    const pulse = () => { const t0 = c.currentTime + 0.05; beat(t0, 60, 0.9); beat(t0 + 0.28, 52, 0.6); };
    pulse(); M.heartTimer = setInterval(pulse, 850);
    return true;
  }
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, kind === "shush" ? "white" : kind); src.loop = true;
  if (kind === "shush") {   // 嘘声：带通滤过的噪音，音量慢慢起伏，像大人在耳边「嘘——」
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2500; bp.Q.value = 0.9;
    const amp = c.createGain(); amp.gain.value = 0.6; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.35; lg.gain.value = 0.35; lfo.connect(lg).connect(amp.gain); lfo.start();
    src.connect(bp).connect(amp).connect(M.gain); M.nodes.push(lfo, bp, amp);
  } else src.connect(M.gain);
  src.start(); M.nodes.push(src);
  return true;
}

/* ---- 播放控制 ---- */
function releaseAudio(){ if (M.audio) { try { M.audio.pause(); M.audio.ontimeupdate = M.audio.onended = M.audio.onplay = M.audio.onpause = null; M.audio.src = ""; } catch { /* 忽略 */ } } if (M.url) URL.revokeObjectURL(M.url); M.audio = M.url = null; }
function stopAll(){ releaseAudio(); stopSound(); M.playing = false; clearTimer(); }
async function playSong(i){
  const s = M.songs[i]; if (!s) return;
  stopSound(); releaseAudio(); M.i = i; M.loading = true; M.playing = false; repaint();
  try {
    const blob = await songBlob(s); if (M.songs[M.i] !== s) return;
    const a = new Audio(); M.url = URL.createObjectURL(blob); a.src = M.url; a.volume = M.vol; M.audio = a;
    a.ontimeupdate = tick; a.onloadedmetadata = tick; a.onended = advance;
    a.onplay = () => { M.playing = true; sync(); }; a.onpause = () => { M.playing = false; sync(); };
    await a.play();
  } catch (e) { M.playing = false; toastMsg(e.message || t("播放失败")); }
  M.loading = false; meta(); repaint();
}
function advance(){
  if (M.loop === "one" && M.audio) { M.audio.currentTime = 0; M.audio.play().catch(() => {}); return; }
  const n = M.i + 1 < M.songs.length ? M.i + 1 : M.loop === "list" ? 0 : -1;
  if (n < 0) { M.playing = false; repaint(); return; }
  playSong(n);
}
async function toggle(){
  if (srcNow() === "sound") {
    if (M.playing) { stopSound(); M.playing = false; clearTimer(); }
    else { releaseAudio(); M.playing = playSound(M.sound); if (!M.playing) toastMsg(t("这个浏览器放不了合成的声音")); }
    meta(); repaint(); return;
  }
  if (!M.audio) { if (M.songs.length) await playSong(M.i); return; }
  if (M.audio.paused) await M.audio.play().catch((e) => toastMsg(e.message)); else M.audio.pause();
}
const step = (d) => { if (srcNow() === "sound") { const k = SOUNDS.findIndex(([x]) => x === M.sound); pickSound(SOUNDS[(k + d + SOUNDS.length) % SOUNDS.length][0]); return; } if (!M.songs.length) return; if (d < 0 && M.audio && M.audio.currentTime > 3) { M.audio.currentTime = 0; return; } playSong((M.i + d + M.songs.length) % M.songs.length); };
function pickSound(k){ M.sound = k; put(K.sound, k); if (M.playing && srcNow() === "sound") playSound(k); repaint(); }
function setSrc(src){ if (src === srcNow()) return; stopAll(); M.src = src; put(K.src, src); if (src === "song") loadSongs(); repaint(); }
function setVol(v){ M.vol = Math.max(0, Math.min(1, v)); put(K.vol, M.vol); if (M.audio) M.audio.volume = M.vol; if (M.gain) M.gain.gain.value = M.vol; }
function cycleLoop(){ M.loop = M.loop === "list" ? "one" : M.loop === "one" ? "off" : "list"; put(K.loop, M.loop); sync(); }
/* 定时关：到点前 10 秒慢慢变小，然后停 */
function clearTimer(){ clearInterval(M.timerTick); M.timerTick = 0; M.timerEnd = 0; M.timerMin = 0; }
function setTimer(min){
  clearTimer(); if (!min) { repaint(); return; }
  M.timerMin = min; M.timerEnd = Date.now() + min * 60e3;
  M.timerTick = setInterval(() => {
    const left = M.timerEnd - Date.now();
    if (left <= 10e3 && left > 0) { const k = left / 10e3; if (M.audio) M.audio.volume = M.vol * k; if (M.gain) M.gain.gain.value = M.vol * k; }
    if (left <= 0) { stopAll(); setVol(M.vol); repaint(); }
    else document.querySelectorAll(".bm-timer-left").forEach((el) => { el.textContent = mmss(left / 1000); });
  }, 1000);
  repaint();
}
function meta(){
  if (!("mediaSession" in navigator)) return;
  try {
    const s = srcNow() === "song" ? M.songs[M.i] : null, snd = SOUNDS.find(([k]) => k === M.sound);
    navigator.mediaSession.metadata = new MediaMetadata({ title: s ? s.title : t(snd[1]), artist: s ? s.artist || "" : t("宝宝声音"), album: t("小月亮") });
    navigator.mediaSession.setActionHandler("play", () => toggle()); navigator.mediaSession.setActionHandler("pause", () => toggle());
    navigator.mediaSession.setActionHandler("nexttrack", () => step(1)); navigator.mediaSession.setActionHandler("previoustrack", () => step(-1));
  } catch { /* 忽略 */ }
}

/* ---- 界面 ---- */
const LOOPS = { list: ["🔁", "歌单循环"], one: ["🔂", "单曲循环"], off: ["➡️", "播完就停"] };
const mmss = (s) => (Number.isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");
let toastMsg = toast, rerender = () => {};
export function initMusic({ toast, render }){ toastMsg = toast || toastMsg; rerender = render || rerender; }
function repaint(){ document.querySelectorAll("[data-bmcard]").forEach((el) => { el.outerHTML = musicSlideInner(el.dataset.bmcard === "clone"); }); }
const btn = (act, label, ch, cls = "", extra = "") => `<button type="button" class="bm-btn ${cls}" data-bm="${act}" ${extra} aria-label="${esc(label)}" title="${esc(label)}">${ch}</button>`;
/** 卡片内容（heroHTML 里每份副本都放一张；clone = 循环轨道里的副本，读屏不读） */
export function musicSlideInner(clone = false){
  if (srcNow() === "song" && SB.family && !M.songsAt) loadSongs();
  const src = srcNow(), song = src === "song", s = song ? M.songs[M.i] : null, snd = SOUNDS.find(([k]) => k === M.sound);
  const a = M.audio, pos = a && a.duration ? (a.currentTime / a.duration) * 100 : 0;
  const tabs = `<div class="bm-tabs" role="group" aria-label="${esc(t("声音来源"))}">${btn("src-sound", t("宝宝声音"), `🌙 ${t("宝宝声音")}`, "bm-tab", `aria-pressed="${!song}"`)}${btn("src-song", t("家庭学堂的歌"), `🎵 ${t("家庭学堂的歌")}`, "bm-tab", `aria-pressed="${song}"`)}</div>`;
  const now = song
    ? (M.songs.length ? `<div class="bm-title">${esc(s?.title || "")}</div><div class="bm-sub">${s?.artist ? `${esc(s.artist)} · ` : ""}${M.i + 1}/${M.songs.length}</div>`
      : `<div class="bm-title">${t("还没有歌")}</div><div class="bm-sub">${SB.family ? t("在家庭学堂「资源 → 音乐 → 全部歌曲」里上传 MP3，这里就能放") : t("登录家庭后，能放家庭学堂里上传的歌")}</div>`)
    : `<div class="bm-title">${snd[2]} ${esc(t(snd[1]))}</div><div class="bm-sub">${t("现场合成，离线也能放；建议音量调小、离宝宝远一点")}</div>`;
  const prog = song && M.songs.length ? `<div class="bm-prog"><span class="bm-cur">${mmss(a?.currentTime || 0)}</span><input class="bm-bar" type="range" min="0" max="100" step="0.1" value="${pos}" style="--p:${pos}%" aria-label="${esc(t("播放进度"))}"><span class="bm-dur">${mmss(a?.duration || s?.duration || 0)}</span></div>`
    : !song ? `<div class="bm-sounds" role="group" aria-label="${esc(t("选声音"))}">${SOUNDS.map(([k, n, ic]) => btn(`sound:${k}`, t(n), ic, "bm-chip", `aria-pressed="${M.sound === k}"`)).join("")}</div>` : "";
  const timer = `<label class="bm-timer" title="${esc(t("定时关"))}"><span aria-hidden="true">⏲</span><select data-bmtimer aria-label="${esc(t("定时关"))}">${[0, 15, 30, 45, 60].map((m) => `<option value="${m}" ${M.timerMin === m ? "selected" : ""}>${m ? t("{n} 分钟", { n: m }) : t("不定时")}</option>`).join("")}</select>${M.timerEnd ? `<span class="bm-timer-left">${mmss((M.timerEnd - Date.now()) / 1000)}</span>` : ""}</label>`;
  const ctrl = `<div class="bm-ctrl">
      ${song ? btn("loop", t(LOOPS[M.loop][1]), LOOPS[M.loop][0], "bm-loop") : ""}
      ${btn("prev", song ? t("上一首") : t("上一个声音"), "⏮")}
      ${btn("toggle", M.playing ? t("暂停") : t("播放"), M.loading ? "…" : M.playing ? "❚❚" : "▶", "bm-main", song && !M.songs.length ? "disabled" : "")}
      ${btn("next", song ? t("下一首") : t("下一个声音"), "⏭")}
      <label class="bm-vol" title="${esc(t("音量"))}"><span aria-hidden="true">🔈</span><input type="range" min="0" max="1" step="0.05" value="${M.vol}" data-bmvol aria-label="${esc(t("音量"))}"></label>
    </div>`;
  return `<div class="bm-card" data-bmcard="${clone ? "clone" : "main"}" ${clone ? 'aria-hidden="true"' : ""}>
    <div class="bm-head"><span aria-hidden="true">🎶</span><b>${t("音乐")}</b>${timer}</div>${tabs}<div class="bm-now">${now}</div>${prog}${ctrl}</div>`;
}
function tick(){
  const a = M.audio; if (!a) return; const pos = a.duration ? (a.currentTime / a.duration) * 100 : 0;
  document.querySelectorAll("[data-bmcard]").forEach((el) => {
    const bar = el.querySelector(".bm-bar"); if (bar && !bar._drag) { bar.value = String(pos); bar.style.setProperty("--p", `${pos}%`); }
    const c = el.querySelector(".bm-cur"); if (c) c.textContent = mmss(a.currentTime);
    const d = el.querySelector(".bm-dur"); if (d && a.duration) d.textContent = mmss(a.duration);
  });
}
function sync(){
  document.querySelectorAll("[data-bmcard]").forEach((el) => {
    const m = el.querySelector(".bm-main"); if (m) { m.textContent = M.loading ? "…" : M.playing ? "❚❚" : "▶"; m.setAttribute("aria-label", M.playing ? t("暂停") : t("播放")); }
    const lp = el.querySelector(".bm-loop"); if (lp) { lp.textContent = LOOPS[M.loop][0]; lp.setAttribute("aria-label", t(LOOPS[M.loop][1])); lp.title = t(LOOPS[M.loop][1]); }
  });
  tick();
}

/* ---- 事件：按钮 data-bm，滑块 / 定时在 input / change 里 ---- */
document.addEventListener("click", async (e) => {
  const b = e.target.closest?.("[data-bm]"); if (!b || b.disabled) return;
  e.preventDefault(); e.stopPropagation();
  const a = b.dataset.bm;
  if (a === "toggle") await toggle();
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
  else if (el.dataset?.bmvol !== undefined) { setVol(+el.value); document.querySelectorAll("[data-bmvol]").forEach((x) => { if (x !== el) x.value = el.value; }); }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.classList?.contains("bm-bar")) { el._drag = false; if (M.audio?.duration) M.audio.currentTime = (+el.value / 100) * M.audio.duration; }
  else if (el.dataset?.bmtimer !== undefined) { setTimer(+el.value); toastMsg(+el.value ? t("{n} 分钟后自动停（最后 10 秒慢慢变小）", { n: +el.value }) : t("已取消定时")); }
});
void rerender;
