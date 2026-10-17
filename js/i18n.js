import EN from "./lang/en.js";
import TW from "./lang/zh-TW.js";

/* ============ language ============
   Simplified Chinese is the source text and doubles as the dictionary key, so a string that has no
   translation yet still renders. Record *values* (喂奶方式 "亲喂", 大便颜色 "黄" …) are stored in the
   canonical simplified form on every device and only translated for display, which keeps family
   members on different languages looking at the same data. Per-device setting, like units and theme. */
const LANG_KEY = "xiaoyueliang.v1.lang";
const LANGS = [["auto", "自动"], ["zh-CN", "简体中文"], ["zh-TW", "繁體中文"], ["en", "English"]];
const DICT = { en: EN, "zh-TW": TW };

// Installs that predate the language setting keep Chinese instead of jumping to the phone's language
try { if (!localStorage.getItem(LANG_KEY) && localStorage.getItem("xiaoyueliang.v1")) localStorage.setItem(LANG_KEY, "zh-CN"); } catch (e) {}

function langPref(){ try { return localStorage.getItem(LANG_KEY) || "auto"; } catch (e) { return "auto"; } }
function detect(){
  const l = (navigator.language || "").toLowerCase();
  if (/^zh/.test(l)) return /tw|hk|mo|hant/.test(l) ? "zh-TW" : "zh-CN";
  return "en";
}
let cur = null;
function lang(){ if (!cur) { const p = langPref(); cur = (p === "zh-CN" || DICT[p]) ? p : detect(); } return cur; }
function setLang(pref){ try { localStorage.setItem(LANG_KEY, pref); } catch (e) {} cur = null; applyLang(); }
// t("已保存 {n} 条", { n: 3 }); a key that is missing from the dictionary falls back to the key itself
function t(key, params){
  const d = DICT[lang()];
  let s = d && d[key] != null ? d[key] : key;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => params[k] != null ? params[k] : m);
  return s;
}
// static markup in index.html: <el data-i18n="key"> for text, data-i18n-aria for aria-label
function applyLang(){
  document.documentElement.lang = lang();
  document.title = t("小月亮 · 母婴记录");
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
}
// the model answers in the language of the interface
const answerLang = () => ({ en: "English", "zh-TW": "繁體中文" })[lang()] || "简体中文";

export { LANG_KEY, LANGS, langPref, lang, setLang, t, applyLang, answerLang };
