import { APPS, THIS_APP } from "./apps.js";
import { LANGS, langPref, t } from "./i18n.js";
import { HERO_BUILTIN, allCards, clockLabel, faithOn, hasCardPrefs, heroCustom, heroKeys, pottyMin } from "./stages.js";
import { TYPES, typeLabel } from "./types.js";
import { APP_VERSION, S, activeKids, kidCount, ageText, childName, groupTone, ROUTINE_TPL, isKidType, routineGroups, routineSteps, routineToText, stageOf } from "./state.js";
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
    ${row('data-tab="cards"', t("卡片"), t("今天页的快捷按钮和统计：按孩子打开或关闭，已有记录不受影响"), "◫")}
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
  <p class="small muted">${t("同一个账号、同一个家庭，四个站点互通；标题旁的左右箭头也能切换。")}</p>
  <p class="small muted" style="margin-top:24px">${t("小月亮 · 母婴记录")} · ${t("版本 {v}", { v: APP_VERSION })}</p>`;
}

/* ---- card manager: which quick buttons and stats the active child's Today page shows ---- */
function cardsHTML(){
  const group = (kind, title, note) => {
    const { common, other } = allCards(kind);
    const chip = c => `<button class="chip" data-card="${kind}:${c.key}" aria-pressed="${c.on}">${c.icon} ${esc(t(c.label))}</button>`;
    return `<h2>${title}</h2><div class="panel"><p class="small muted" style="margin-top:0">${note}</p>
      <div class="lab">${t("{stage}常用", { stage: t(stageOf().name) })}</div><div class="chips" role="group" aria-label="${esc(title)}">${common.map(chip).join("")}</div>
      <div class="lab">${t("其他阶段的卡片")}</div><div class="chips" role="group" aria-label="${esc(title)} · ${t("其他")}">${other.map(chip).join("")}</div></div>`;
  };
  return `<h2>${t("卡片")} <span class="small muted" style="font-weight:400">${esc(childName())} · ${esc(ageText())}</span></h2>
  <p class="small muted">${t("点一下打开或关闭（深色表示正在显示）。关闭只是不再显示在今天页，已有的记录仍在记录页，随时可以重新打开。每个孩子分别设置；顶部切换孩子即可。")}</p>
  <div class="panel mlist">
    ${mrow('data-tab="herocfg"', t("顶部大计时"), t("今天页最上面可左右滑动的卡片：数什么、顺序、自定义"), "⏱")}
    ${mrow('data-tab="routinecfg"', t("习惯清单"), t("今天页“今天的习惯”里的步骤和分组"), "🌅")}
  </div>
  ${group("quick", t("快捷按钮"), t("今天页上方的一键记录按钮。"))}
  ${group("stats", t("最近 24 小时统计"), t("今天页的统计，和顶部的大计时。"))}
  ${hasCardPrefs() ? `<div class="btns"><button class="btn" data-act="cards-reset">${t("恢复{stage}的默认卡片", { stage: t(stageOf().name) })}</button></div>` : ""}`;
}

/* ---- the top cards of Today: which "since last" cards, in what order, the child's own cards, the potty nudge ---- */
function heroCfgHTML(){
  const keys = heroKeys(), cust = heroCustom(), slot = Math.min(S.heroEdit || 0, keys.length - 1), d = S.hcDraft, hasRoutine = routineSteps().length > 0;
  const lab = k => esc(t(clockLabel(k)));
  const avail = [...HERO_BUILTIN, ...cust.map(x => x.id)].filter(k => k !== "routine" || hasRoutine);
  const chip = (op, k, on) => `<button class="chip" data-hc="${op}:${esc(k)}" aria-pressed="${on}">${lab(k)}</button>`;
  // one long pill per card: drag its ⋮⋮ (right end) up or down to reorder, swipe it left to reveal 移除; a tap picks it for the "what does it count" chips above
  const rows = keys.map((k, i) => `<div class="hcrow">${keys.length > 1 ? `<div class="hcdel" aria-hidden="true"><span>${t("向左滑动移除")}</span><b>${t("松手移除")}</b></div>` : ""}<div class="hcpill" aria-current="${i === slot}">
      <button class="hclab" data-hc="sel:${i}" aria-pressed="${i === slot}"><b class="num">${i + 1}</b><span>${lab(k)}</span></button>
      ${cust.some(x => x.id === k) ? `<button class="hcedit" data-hc="edit:${esc(k)}" aria-label="${t("编辑")}">✎</button>` : ""}<span class="grip" aria-hidden="true">⋮⋮</span></div></div>`).join("");
  const types = Object.keys(TYPES).filter(k => isKidType(k) && (k !== "faith" || faithOn()));
  const kinds = d && TYPES[d.type] ? ((TYPES[d.type].fields.find(f => f.k === "kind" && Array.isArray(f.opts)) || {}).opts || []) : [];
  const form = d ? `<div class="panel" style="margin-top:10px"><div class="field"><label for="hcName">${t("卡片名称（留空自动命名）")}</label><input id="hcName" type="text" maxlength="30" value="${esc(d.name)}" placeholder="${esc(t("例如：距上次洗澡"))}"></div>
      <div class="lab">${t("数哪类记录")}</div><div class="chips">${types.map(k => `<button class="chip" data-hc="type:${k}" aria-pressed="${d.type === k}">${TYPES[k].icon} ${esc(typeLabel(k))}</button>`).join("")}</div>
      ${kinds.length ? `<div class="lab">${t("只数其中一种（可不选）")}</div><div class="chips">${kinds.map(o => `<button class="chip" data-hc="kind:${esc(o)}" aria-pressed="${d.kind === o}">${esc(t(o))}</button>`).join("")}</div>` : ""}
      <div class="btns"><button class="btn primary" data-act="hc-save">${t("保存")}</button><button class="btn" data-hc="cancel">${t("取消")}</button>${d.id ? `<button class="btn danger" data-hc="rm:${esc(d.id)}">${t("删除")}</button>` : ""}</div></div>` : "";
  return `<h2>${t("顶部大计时")} <span class="small muted" style="font-weight:400">${esc(childName())}</span></h2>
  <p class="small muted">${t("今天页最上面的卡片可以左右滑动，每张数一件事。下面可以改每张数什么、调顺序、增删，也能自己做一张。")}</p>
  <h2>${t("第 {n} 张卡数什么", { n: slot + 1 })}</h2><div class="panel"><div class="chips" role="group" aria-label="${t("第 {n} 张卡数什么", { n: slot + 1 })}">${avail.map(k => chip("set", k, keys[slot] === k)).join("")}</div></div>
  <h2>${t("全部卡片")}</h2><div class="panel"><p class="small muted" style="margin:0 0 8px">${t("拖右边的 ⋮⋮ 上下调顺序；向左滑动胶囊，滑过一半松手就移除；点一下胶囊，在上面选它数什么。")}</p><div class="hclist">${rows}</div></div>
  <h2>${t("添加")}</h2><div class="panel"><div class="chips">${avail.filter(k => !keys.includes(k)).map(k => chip("add", k, false)).join("")}<button class="chip" data-hc="new:">+ ${t("自定义卡片")}</button></div>${form}</div>
  ${keys.includes("potty") ? `<h2>${t("如厕提醒间隔（分钟）")}</h2><div class="panel"><div class="chips">${[60, 90, 120, 180].map(m => `<button class="chip" data-pottymin="${m}" aria-pressed="${pottyMin() === m}">${m}</button>`).join("")}</div></div>` : ""}
  ${(S.settings.heroPref || {})[S.childId] ? `<div class="btns"><button class="btn" data-hc="reset:">${t("恢复默认")}</button></div>` : ""}`;
}
/* ---- the daily routine list: groups and steps ---- */
function routineCfgHTML(){
  return `<h2>${t("习惯清单")} <span class="small muted" style="font-weight:400">${esc(childName())}</span></h2><div class="panel routine-ed">
    <p class="small muted" style="margin-top:0">${t("今天页的“今天的习惯”：分成晨间、午间、睡前等几组，一行一步，按先后顺序写；同名的步骤会自动加编号。改名或删除不影响已有记录。全部清空后保存，就不再显示。")}</p>
    <div class="lab">${t("加入模板")}</div><div class="chips">${ROUTINE_TPL.map((g, i) => `<button class="chip" data-tpl="${i}">+ ${esc(t(g.name))}</button>`).join("")}</div>
    ${routineGroups().some(g => g.name) ? `<div class="lab">${t("当前分组颜色")}</div><div class="chips">${routineGroups().map(g => g.name ? `<span class="rgtag ${groupTone(g.name)}">${esc(t(g.name))}</span>` : "").join("")}</div>` : ""}
    <label class="lab" for="routineSteps">${t("每行一步；以 # 开头的一行是分组名")}</label><textarea id="routineSteps" rows="12">${esc(routineToText(routineGroups()))}</textarea>
    <div class="btns"><button class="btn primary" data-act="routine-save">${t("保存清单")}</button><button class="btn" data-act="routine-reset">${t("恢复默认清单")}</button></div></div>`;
}

/* ---- faith module (opt-in): family statement, on / off, which children ---- */
const FAITH_TEMPLATE = "我们是一个基督徒家庭，愿意带孩子认识神、爱神、爱人，从小学做荣神益人的小门徒。";
function faithHTML(){
  const f = S.settings.faith, kids = activeKids();
  return `<p class="small muted" style="margin-top:0">${t("可选功能。关闭时，这个 App 里看不到任何信仰相关的内容；打开后会出现家庭敬拜、祷告、读经、服事等记录卡片。这里只记录家庭一起做了什么，不给孩子的信心打分，也不做连续打卡。")}</p>
    <div class="chips" role="group" aria-label="${t("信仰（可选）")}"><button class="chip" data-faith="toggle" aria-pressed="${f.on}">${f.on ? t("已打开信仰记录") : t("打开信仰记录")}</button></div>
    ${f.on ? `
    <div class="field"><label for="faithStatement">${t("我们的信仰宣告（选填，家里所有人都能看到）")}</label>
      <textarea id="faithStatement" maxlength="400" placeholder="${esc(t(FAITH_TEMPLATE))}">${esc(f.statement)}</textarea>
      <button class="chip" data-faith="template" style="margin-top:6px">${t("用模板")}</button>
      <p class="small muted" style="margin:6px 0 0">${t("它会显示在信仰记录的表单顶部，提醒我们为什么要记这些。")}</p></div>
    ${kids.length > 1 ? `<div class="lab">${t("给哪些孩子显示")}</div>
      <div class="chips" role="group" aria-label="${t("给哪些孩子显示")}">${kids.map(c => `<button class="chip" data-faith-kid="${esc(c.id)}" aria-pressed="${!f.off.includes(c.id)}">${esc(c.name || t("宝宝"))}</button>`).join("")}</div>` : ""}
    <p class="small muted">${t("信仰记录和别的记录一样，可以设为“仅我”或“指定家人”可见；青少年阶段默认“仅我”。想关掉时，已记的内容仍保留在记录页。")}</p>
    <div class="btns"><button class="btn primary" data-act="savesettings">${t("保存设置")}</button></div>` : ""}`;
}

/* ---- archived children: restore, or delete for good (the only path that removes their records) ---- */
function archivedKidsHTML(){
  const gone = S.settings.children.filter(c => c.archived);
  if (!gone.length) return "";
  return `<div class="lab" style="margin-top:14px">${t("已归档的孩子")}</div>` + gone.map(c => {
    const n = kidCount(c.id), nm = esc(c.name || t("这个孩子"));
    return `<div class="medrow"><span><b>${nm}</b> <small class="muted">${t("{n} 条记录", { n })}</small></span>
      <span class="chips"><button class="chip" data-act="restorekid" data-id="${esc(c.id)}" aria-label="${t("恢复{name}", { name: nm })}">${t("恢复")}</button>
      <button class="chip danger" data-act="purgekid" data-id="${esc(c.id)}" aria-label="${t("彻底删除{name}", { name: nm })}">${t("彻底删除")}</button></span></div>`;
  }).join("");
}

/* ---- settings page ---- */
function settingsHTML(){
  const st = S.settings;
  const seg = (attr, cur, items, label) => `<div class="seg" role="group" aria-label="${label}">${items.map(([v, l]) => `<button ${attr}="${v}" aria-pressed="${cur === v}">${l}</button>`).join("")}</div>`;
  return `<div class="softform">
  <h2>${t("设置")}</h2>
  <div class="panel"><div class="lab">${t("孩子（小名 · 出生日期）")}</div>
    <div id="kidRows">${st.children.map((c, i) => c.archived ? "" : `<div class="kidcard">
      <div class="kidhead"><span class="small muted">${t("第{n}个孩子", { n: i + 1 })}${c.birth ? ` · ${esc(ageText(c.id))}` : ""}</span>${activeKids().length > 1 ? `<button class="chip" data-act="archivekid" data-i="${i}" aria-label="${t("归档{name}", { name: esc(c.name || t("这个孩子")) })}">${t("归档")}</button>` : ""}</div>
      <div class="kidrow"><input type="text" aria-label="${t("第{n}个孩子的小名", { n: i + 1 })}" data-kr="${i}" data-kk="name" value="${esc(c.name)}" placeholder="${t("小名")}"><input type="date" aria-label="${t("第{n}个孩子的出生日期", { n: i + 1 })}" data-kr="${i}" data-kk="birth" value="${esc(c.birth)}"></div></div>`).join("")}</div>
    <button class="chip" data-act="addkid">${t("＋ 添加孩子")}</button>
    ${archivedKidsHTML()}
    <p class="small muted" style="margin-top:6px">${t("每个孩子的记录分开保存，点页面顶部的名字可以切换。妈妈的记录属于整个家庭，不随孩子切换。")}</p>
    <p class="small muted">${t("“归档”不会删除任何记录：这个孩子只是不再出现在切换和记录选择里，随时可以恢复。")}</p>
    <div class="lab" style="margin-top:14px">${t("妈妈用药的最短间隔（按医嘱或说明书填写）")}</div>
    <div id="medRules">${(st.medIntervals || []).map((r, i) => `<div class="row2" style="margin-bottom:6px"><input type="text" aria-label="${t("药名")}" data-mr="${i}" data-mk="name" value="${esc(r.name)}" placeholder="${t("药名")}"><input type="number" inputmode="decimal" aria-label="${t("间隔小时")}" data-mr="${i}" data-mk="hours" value="${esc(r.hours)}" placeholder="${t("间隔（小时）")}"></div>`).join("")}</div>
    <button class="chip" data-act="addrule">${t("＋ 添加一种药")}</button>
    <div class="btns"><button class="btn primary" data-act="savesettings">${t("保存设置")}</button></div></div>

  <h2>${t("信仰（可选）")}</h2>
  <div class="panel">${faithHTML()}</div>

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
  <div class="panel">${seg("data-theme-set", document.documentElement.dataset.theme || "", [["", t("跟随系统")], ["light", t("浅色")], ["dark", t("深色（夜里喂奶）")]], t("外观"))}</div>
  </div>`;
}
function readSettingsInputs(){
  // start from the full list so archived children (no row on screen) are never dropped
  const kids = S.settings.children.map(c => ({ ...c })); let seen = false;
  document.querySelectorAll("[data-kr]").forEach(el => { const k = kids[+el.dataset.kr]; if (k) { k[el.dataset.kk] = el.value.trim(); seen = true; } });
  if (seen) S.settings.children = kids;
  const rules = []; document.querySelectorAll("[data-mr]").forEach(el => { const i = +el.dataset.mr; (rules[i] ||= { name: "", hours: "" })[el.dataset.mk] = el.value.trim(); });
  S.settings.medIntervals = rules.filter(r => r && (r.name || r.hours));
  const fs = $("#faithStatement"); if (fs) S.settings.faith.statement = fs.value.trim();
}
// re-render the settings page after cloud state changed (login, members, invite code), unless a form is open on top
function refreshSettingsIfOpen(){ if (S.tab === "settings" && !$("#sheet").open) render(); }

export { viewMe, cardsHTML, heroCfgHTML, routineCfgHTML, faithHTML, FAITH_TEMPLATE, settingsHTML, readSettingsInputs, refreshSettingsIfOpen };
