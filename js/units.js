import { $ } from "./util.js";

/* ============ units ============
   Data is always stored in metric (kg, cm, ml, ℃) so old records, charts and family members on
   other unit systems stay consistent. Only display and input are converted. Per-device setting. */
const UNIT_KEY = "xiaoyueliang.v1.units";
function unitPref(){ try { return localStorage.getItem(UNIT_KEY) || "auto"; } catch (e) { return "auto"; } }
function isUS(){
  const p = unitPref(); if (p !== "auto") return p === "us";
  let tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  return /^en-US/i.test(navigator.language || "") || /^America\//.test(tz);
}
const KG_LB = 2.2046226, CM_IN = 2.54, OZ_ML = 29.5735;
const trim = (x, d) => String(Math.round(x * 10 ** d) / 10 ** d);
function unitOf(dim){
  const us = isUS();
  return { wbaby: us ? "lb" : "kg", wmom: us ? "lb" : "kg", len: us ? "in" : "cm", temp: us ? "℉" : "℃", vol: us ? "fl oz" : "ml" }[dim];
}
// canonical metric → number in display unit
function toDisp(dim, v){
  if (v == null || v === "") return null; v = +v; if (!isUS()) return v;
  if (dim === "wbaby" || dim === "wmom") return v * KG_LB;
  if (dim === "len") return v / CM_IN;
  if (dim === "temp") return v * 9 / 5 + 32;
  if (dim === "vol") return v / OZ_ML;
  return v;
}
function fromDisp(dim, x){
  if (x == null || x === "" || isNaN(+x)) return null; x = +x; if (!isUS()) return x;
  if (dim === "wbaby" || dim === "wmom") return +(x / KG_LB).toFixed(4);
  if (dim === "len") return +(x * CM_IN).toFixed(2);
  if (dim === "temp") return +((x - 32) * 5 / 9).toFixed(2);
  if (dim === "vol") return +(x * OZ_ML).toFixed(1);
  return x;
}
const DISP_DEC = { wbaby: 2, wmom: 1, len: 2, temp: 1, vol: 1 };
// formatted string with unit, e.g. "7 lb 8.6 oz", "3.42kg", "2 fl oz"
function fmtU(dim, v){
  if (v == null || v === "") return "";
  if (!isUS()) return trim(+v, { wbaby: 2, wmom: 1, len: 1, temp: 1, vol: 0 }[dim]) + unitOf(dim);
  if (dim === "wbaby") { const tot = +v * KG_LB * 16; let lb = Math.floor(tot / 16), oz = Math.round((tot - lb * 16) * 10) / 10; if (oz >= 16) { lb++; oz = 0; } return `${lb} lb ${trim(oz, 1)} oz`; }
  return trim(toDisp(dim, v), DISP_DEC[dim]) + " " + unitOf(dim);
}

export { UNIT_KEY, unitPref, isUS, KG_LB, CM_IN, OZ_ML, trim, unitOf, toDisp, fromDisp, DISP_DEC, fmtU };
