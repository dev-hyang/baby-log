import { APPS, THIS_APP } from "./apps.js";
import { LANGS, langPref, t } from "./i18n.js";
import { APP_VERSION, S, ageText, childName } from "./state.js";
import { familyHTML } from "./sync.js";
import { isUS, unitPref } from "./units.js";
import { $, esc } from "./util.js";
import { mrow, render } from "./views.js";

/* ============ 我的: the hub for everything that is not daily logging ============
   Same design as homeschool: one list row per entry (icon, title, one-line description, ›), then the print
   pages, then the sister apps. Settings / Q&A / About open as full pages with a "‹ 我的" chip on top and the
   我的 tab stays highlighted (see SUB in views.js). */
function viewMe(){
  const row = mrow;
  const link = a => `<a class="mrow" href="${a.url}"><span class="mi" aria-hidden="true">↗</span><span class="mt"><b>${esc(t(a.name))}</b><small>${esc(t(a.desc))}</small></span><span class="mch" aria-hidden="true">›</span></a>`;
  return `
  <h2>${t("我的")} <span class="small muted" style="font-weight:400">${esc(childName())} · ${esc(ageText())}</span></h2>
  <div class="panel mlist">
    ${row('data-tab="settings"', t("设置"), t("孩子、妈妈用药间隔、家庭协作、备份、语言、单位、显示"), "⚙")}
    ${row('data-tab="learn"', t("问答"), t("什么时候联系儿科医生、向 AI 提问、权威资料"), "?")}
    ${row('data-tab="about"', t("介绍"), t("这是什么、每页怎么用、小技巧、注意事项、数据与隐私"), "✎")}
  </div>

  <h2>${t("打印")}</h2>
  <div class="panel mlist">
    ${row('data-act="print-meal"', t("按餐表格"), t("记录页当前显示的那一天，一餐一行，横版一页。"), "▦")}
    ${row('data-act="print-trend"', t("趋势对比"), S.gran === "week" ? t("最近 8 周的日均值，指标 × 周，横版一页。") : t("最近 7 天，指标 × 日期，横版一页。"), "▤")}
    ${row('data-act="print-timeline"', t("时间线"), t("沿用时间线当前的筛选和搜索，最近 30 天按日分组。"), "≡")}
    ${row('data-act="print-medical"', t("就医记录"), t("体检与就诊、体检时间表、疫苗、生长测量、最近 90 天用药，带去医院用。"), "✚")}
  </div>
  <p class="small muted">${t("黑白表格，页眉带孩子姓名、年龄和打印时间。手机上会先出现系统的打印界面，也可以在那里存为 PDF。")}</p>

  <h2>${t("姐妹应用")}</h2>
  <div class="panel mlist">${APPS.filter(a => a.key !== THIS_APP).map(link).join("")}</div>
  <p class="small muted">${t("同一个账号、同一个家庭，三个站点互通；标题旁的左右箭头也能切换。")}</p>
  <p class="small muted" style="margin-top:24px">${t("小月亮 · 母婴记录")} · ${t("版本 {v}", { v: APP_VERSION })}</p>`;
}

/* ---- settings page ---- */
function settingsHTML(){
  const st = S.settings;
  const seg = (attr, cur, items, label) => `<div class="seg" role="group" aria-label="${label}">${items.map(([v, l]) => `<button ${attr}="${v}" aria-pressed="${cur === v}">${l}</button>`).join("")}</div>`;
  return `
  <h2>${t("设置")}</h2>
  <div class="panel"><div class="lab">${t("孩子（小名 · 出生日期）")}</div>
    <div id="kidRows">${st.children.map((c, i) => `<div class="kidrow"><input type="text" aria-label="${t("第{n}个孩子的小名", { n: i + 1 })}" data-kr="${i}" data-kk="name" value="${esc(c.name)}" placeholder="${t("小名")}"><input type="date" aria-label="${t("第{n}个孩子的出生日期", { n: i + 1 })}" data-kr="${i}" data-kk="birth" value="${esc(c.birth)}">${st.children.length > 1 ? `<button class="chip" data-act="delkid" data-i="${i}" aria-label="${t("移除{name}", { name: esc(c.name || t("这个孩子")) })}">${t("移除")}</button>` : ""}</div>`).join("")}</div>
    <button class="chip" data-act="addkid">${t("＋ 添加孩子")}</button>
    <p class="small muted" style="margin-top:6px">${t("每个孩子的记录分开保存，点页面顶部的名字可以切换。妈妈的记录属于整个家庭，不随孩子切换。")}</p>
    <div class="lab" style="margin-top:14px">${t("妈妈用药的最短间隔（按医嘱或说明书填写）")}</div>
    <div id="medRules">${(st.medIntervals || []).map((r, i) => `<div class="row2" style="margin-bottom:6px"><input type="text" aria-label="${t("药名")}" data-mr="${i}" data-mk="name" value="${esc(r.name)}" placeholder="${t("药名")}"><input type="number" inputmode="decimal" aria-label="${t("间隔小时")}" data-mr="${i}" data-mk="hours" value="${esc(r.hours)}" placeholder="${t("间隔（小时）")}"></div>`).join("")}</div>
    <button class="chip" data-act="addrule">${t("＋ 添加一种药")}</button>
    <div class="btns"><button class="btn primary" data-act="savesettings">${t("保存设置")}</button></div></div>

  <h2>${t("家庭协作")}</h2>
  <div class="panel">${familyHTML()}</div>
  <h2>${t("数据")}</h2>
  <div class="panel"><p class="small muted">${S.mode === "family" ? t("记录保存在家庭云端，每台设备都有一份离线副本；没网时照常记录，联网后自动同步。") : S.mode === "cloud" ? t("记录已同步到你的 Claude 账号，同时在本设备留有副本。") : t("记录目前只保存在这台设备的浏览器里。换手机或清理浏览器数据会丢失，建议每周导出一次备份。")}</p>
  <div class="btns"><button class="btn" data-act="export">${t("导出备份（JSON）")}</button><button class="btn" data-act="csv">${t("导出表格（CSV）")}</button><button class="btn" data-act="import">${t("从备份恢复")}</button></div>
  <div class="btns"><button class="btn" data-act="demo">${t("载入演示数据")}</button><button class="btn" data-act="cleardemo">${t("清除演示数据")}</button><button class="btn danger" data-act="clearall">${t("清空全部记录")}</button></div></div>
  <h2>${t("语言 / Language")}</h2>
  <div class="panel">${seg("data-lang-set", langPref(), LANGS.map(([v, l]) => [v, v === "auto" ? t("自动") : l]), t("语言 / Language"))}
  <p class="small muted" style="margin-top:6px">${t("只影响这台设备的显示。记录内容按统一格式保存，家人可以各看各的语言。")}</p></div>
  <h2>${t("单位")}</h2>
  <div class="panel">${seg("data-units-set", unitPref(), [["auto", t("自动（当前：{u}）", { u: isUS() ? t("美制") : t("公制") })], ["metric", t("公制 kg · cm · ml · ℃")], ["us", t("美制 lb · in · fl oz · ℉")]], t("单位"))}
  <p class="small muted" style="margin-top:6px">${t("只影响这台设备的显示和输入。数据统一按公制保存，切换不会改动已有记录，家人可以各用各的单位。“自动”按手机的语言和时区判断（北美时区默认美制）。")}</p></div>
  <h2>${t("显示")}</h2>
  <div class="panel">${seg("data-theme-set", document.documentElement.dataset.theme || "", [["", t("跟随系统")], ["light", t("浅色")], ["dark", t("深色（夜里喂奶）")]], t("外观"))}</div>`;
}
function readSettingsInputs(){
  const kids = []; document.querySelectorAll("[data-kr]").forEach(el => { const i = +el.dataset.kr; (kids[i] ||= { ...S.settings.children[i] })[el.dataset.kk] = el.value.trim(); });
  if (kids.length) S.settings.children = kids.filter(c => c && c.id);
  const rules = []; document.querySelectorAll("[data-mr]").forEach(el => { const i = +el.dataset.mr; (rules[i] ||= { name: "", hours: "" })[el.dataset.mk] = el.value.trim(); });
  S.settings.medIntervals = rules.filter(r => r && (r.name || r.hours));
}
// re-render the settings page after cloud state changed (login, members, invite code), unless a form is open on top
function refreshSettingsIfOpen(){ if (S.tab === "settings" && !$("#sheet").open) render(); }

export { viewMe, settingsHTML, readSettingsInputs, refreshSettingsIfOpen };
