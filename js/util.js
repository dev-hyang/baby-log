import { t } from "./i18n.js";

/* ============ helpers ============ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const H = 3600e3, D = 86400e3;
const pad = n => String(n).padStart(2, "0");
const hm = ts => { const d = new Date(ts); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const toInput = ts => { const d = new Date(ts); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes()); };
const fromInput = v => v ? new Date(v).getTime() : null;
function dur(ms){ if (ms < 0) ms = 0; const m = Math.floor(ms / 60000), h = Math.floor(m / 60); return h ? t("{h}小时{m}分", { h, m: m % 60 }) : t("{m}分钟", { m }); }
const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
function weekday(ts){ return t(WEEKDAYS[new Date(ts).getDay()]); }
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("on"), 2400); }
const num = v => (v === "" || v == null || isNaN(+v)) ? null : +v;

export { $, esc, newId, H, D, pad, hm, dayKey, startOfDay, toInput, fromInput, dur, weekday, toast, num };
