/* ============ 小Y问 · AI 问询页（我的 → 小Y问；今天页右上角也有入口） ============
   和爱家小助手的「小Y问」同一套思路：有 key（设置里自己填，只存本机，见 js/ai.js）直接出答案；没 key 就把问题连同
   孩子最近记录的统计摘要拼成提示词，一键复制到任一 AI 粘贴。场景按孩子的阶段显示：新生儿问下次喂奶，幼儿问情绪，
   学龄问陪伴……每个场景一句默认问题，可以改。
   发给模型的只有统计数字和固定选项值（次数、间隔、时长、体重、里程碑名、情绪种类），不含备注、起因、谁陪的、
   孩子姓名；页面底部「会发送什么」能看到原文。 */
import { PROVIDERS, aiReady, aiSettings, askText, providerOf, saveAiSettings, testAi } from "./ai.js";
import { answerLang, t } from "./i18n.js";
import { S, ageMonths, ageText, babyAgeDays, childName, childOf, isKidType, stageOf, vis } from "./state.js";
import { $, D, dayKey, esc, toast } from "./util.js";
import { render } from "./views.js";

/** 小Y 图标：圆角渐变底 + 白色 Y + 右上角一颗蜜黄小星（和爱家小助手同款），随文字大小缩放 */
const aiIcon = (size = 22) => `<svg class="ai-ico" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  <defs><linearGradient id="aiG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#45658F"/><stop offset="1" stop-color="#8DB8E4"/></linearGradient></defs>
  <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#aiG)"/>
  <path d="M9.5 9.5 C11.5 13 13.5 15 16 17.5 C18.5 15 20.5 13 22.5 9.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16 17.5 V24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M24.5 4.5 L25.6 7.4 L28.5 8.5 L25.6 9.6 L24.5 12.5 L23.4 9.6 L20.5 8.5 L23.4 7.4 Z" fill="#E9B83A"/></svg>`;

// 场景：一句默认问题 + 适用阶段（不写 stages 的所有阶段都有）。问题是字典 key，显示时翻译
const TOPICS = [
  { id: "feed", icon: "🍼", stages: ["newborn", "infant"], name: "下次喂奶", q: "根据最近的喂奶记录，下一顿大概什么时候、喂多少比较合适？有什么要注意的？" },
  { id: "sleep", icon: "🌙", name: "睡眠与作息", q: "看最近一周的睡眠记录，作息上有什么可以调整的？怎么帮孩子睡得更好？" },
  { id: "diaper", icon: "🧷", stages: ["newborn", "infant"], name: "尿布与消化", q: "最近的尿布记录正常吗？大便次数和颜色有没有需要留意的？" },
  { id: "food", icon: "🥣", stages: ["infant", "toddler", "preschool"], name: "辅食与吃饭", q: "根据最近的饮食记录，接下来可以尝试哪些食物？吃饭习惯上有什么建议？" },
  { id: "emotion", icon: "🙂", stages: ["toddler", "preschool", "school", "teen"], name: "情绪管理", q: "看最近记录的情绪和行为，孩子发脾气、哭闹或低落的时候，我该怎么回应？" },
  { id: "company", icon: "🤗", name: "陪伴与互动", q: "按孩子现在的年龄，每天怎么安排高质量的陪伴？推荐几个适合的互动方式。" },
  { id: "grow", icon: "⭐", name: "生长发育", q: "根据体重、身高和里程碑记录，孩子的发育进度怎么样？接下来可以留意和引导什么？" },
  { id: "mom", icon: "♡", stages: ["newborn"], name: "妈妈产后恢复", q: "根据妈妈最近的身体记录（睡眠、疼痛、心情），产后恢复上有什么建议？" },
  { id: "doctor", icon: "🩺", name: "要不要看医生", q: "结合最近的记录，有没有需要留意的信号？出现什么情况应该联系儿科医生？" },
];
// 没 key 时可直接打开的 AI 网页（手机上会拉起已装的 App）
const SITES = [["ChatGPT", "https://chatgpt.com/"], ["DeepSeek", "https://chat.deepseek.com/"], ["Claude", "https://claude.ai/new"], ["豆包", "https://www.doubao.com/chat/"], ["通义千问", "https://www.tongyi.com/"], ["Kimi", "https://www.kimi.com/"], ["Gemini", "https://gemini.google.com/app"]];

const A = { q: "", ctx: true, busy: false, answer: null, error: null, cfg: false, draft: null };
let ctl = null;

/* ---- 记录摘要：最近 7 天的统计数字，按阶段挑相关的几块 ---- */
const r1 = x => Math.round(x * 10) / 10;
const count = (list, f) => list.reduce((m, e) => { const k = f(e); if (k) m[k] = (m[k] || 0) + 1; return m; }, {});
const topKinds = (m, n = 4) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${t(k)} ${v}`).join("、");
function contextText(){
  const now = Date.now(), from = now - 7 * D, all = vis(), week = all.filter(e => e.ts >= from && e.ts <= now + 60e3), day = week.filter(e => e.ts >= now - D);
  const days = Math.max(1, Math.min(7, Math.ceil((now - Math.min(...week.map(e => e.ts), now)) / D)));
  const per = n => r1(n / days);
  const stage = stageOf(), ad = babyAgeDays(), m = ageMonths(), L = [];
  L.push(t("孩子：{age}，{stage}", { age: ad == null ? t("年龄未填") : m < 24 ? t("出生 {d} 天（{m} 个月）", { d: ad, m }) : t("{y} 岁 {m} 个月", { y: Math.floor(m / 12), m: m % 12 }), stage: t(stage.name) }));
  L.push(t("最近 {n} 天的记录摘要（统计值，不含备注）：", { n: days }));
  const feeds = week.filter(e => e.type === "feed").sort((a, b) => a.ts - b.ts);
  if (feeds.length) {
    const gaps = feeds.slice(1).map((e, i) => e.ts - feeds[i].ts).filter(g => g > 10 * 60e3 && g < 12 * 3600e3);
    const ml = feeds.filter(e => +e.ml > 0), nurse = feeds.filter(e => +e.left > 0 || +e.right > 0);
    const lastFeed = feeds[feeds.length - 1];
    L.push(`- ${t("喂奶")}：${t("每天约 {n} 次", { n: per(feeds.length) })}${gaps.length ? `，${t("平均间隔 {h} 小时", { h: r1(gaps.reduce((a, b) => a + b, 0) / gaps.length / 3600e3) })}` : ""}${ml.length ? `，${t("瓶喂平均 {ml} ml", { ml: Math.round(ml.reduce((a, e) => a + +e.ml, 0) / ml.length) })}` : ""}${nurse.length ? `，${t("亲喂平均 {m} 分钟", { m: Math.round(nurse.reduce((a, e) => a + (+e.left || 0) + (+e.right || 0), 0) / nurse.length) })}` : ""}；${t("方式：{k}", { k: topKinds(count(feeds, e => e.method)) })}；${t("最近 24 小时 {n} 次，上一次是 {h} 小时前", { n: day.filter(e => e.type === "feed").length, h: r1((now - lastFeed.ts) / 3600e3) })}`);
  }
  const sleeps = week.filter(e => e.type === "sleep" && e.end && e.end > e.ts);
  if (sleeps.length) {
    const total = sleeps.reduce((a, e) => a + (e.end - e.ts), 0), longest = Math.max(...sleeps.map(e => e.end - e.ts));
    const night = sleeps.filter(e => { const h = new Date(e.ts).getHours(); return h >= 18 || h < 4; });
    L.push(`- ${t("睡眠")}：${t("每天约 {h} 小时，{n} 段", { h: r1(total / days / 3600e3), n: per(sleeps.length) })}，${t("最长一段 {h} 小时", { h: r1(longest / 3600e3) })}${night.length ? `，${t("晚上入睡多在 {h} 点左右", { h: Math.round(night.reduce((a, e) => a + ((new Date(e.ts).getHours() + 24 - 12) % 24), 0) / night.length + 12) % 24 })}` : ""}${sleeps.some(e => e.how) ? `；${t("入睡方式：{k}", { k: topKinds(count(sleeps, e => e.how)) })}` : ""}`);
  }
  const diapers = week.filter(e => e.type === "diaper");
  if (diapers.length) L.push(`- ${t("尿布")}：${t("每天约尿 {w} 次、便 {p} 次", { w: per(diapers.filter(e => e.pee).length), p: per(diapers.filter(e => e.poop).length) })}${diapers.some(e => e.poop && e.color) ? `，${t("大便颜色：{k}", { k: topKinds(count(diapers.filter(e => e.poop), e => e.color)) })}` : ""}`);
  const foods = week.filter(e => e.type === "food");
  if (foods.length) {
    const names = [...new Set(foods.flatMap(e => String(e.foods || "").split(/[,，、\s]+/).filter(Boolean)))].slice(0, 15);
    const bad = foods.filter(e => e.reaction && e.reaction !== "无");
    L.push(`- ${t("饮食")}：${t("{n} 餐", { n: foods.length })}${names.length ? `，${t("吃过：{k}", { k: names.join("、") })}` : ""}${foods.some(e => e.newFood) ? `，${t("新尝试 {n} 种", { n: foods.filter(e => e.newFood).length })}` : ""}${bad.length ? `，${t("有反应：{k}", { k: topKinds(count(bad, e => e.reaction)) })}` : ""}${foods.some(e => e.focus) ? `；${t("吃饭时：{k}", { k: topKinds(count(foods, e => e.focus)) })}` : ""}`);
  }
  const beh = week.filter(e => e.type === "behavior"), mood = week.filter(e => e.type === "mood");
  if (beh.length) L.push(`- ${t("情绪行为")}：${topKinds(count(beh, e => e.kind), 6)}${beh.some(e => +e.minutes) ? `，${t("平均持续 {m} 分钟", { m: Math.round(beh.filter(e => +e.minutes).reduce((a, e) => a + +e.minutes, 0) / beh.filter(e => +e.minutes).length) })}` : ""}`);
  if (mood.length) L.push(`- ${t("情绪（孩子自评）")}：${topKinds(count(mood, e => e.kind), 6)}${mood.some(e => +e.level) ? `，${t("心情平均 {v} / 5", { v: r1(mood.filter(e => +e.level).reduce((a, e) => a + +e.level, 0) / mood.filter(e => +e.level).length) })}` : ""}`);
  const comp = week.filter(e => e.type === "companion"), act = week.filter(e => e.type === "activity");
  if (comp.length) L.push(`- ${t("陪伴")}：${t("{n} 次，共 {m} 分钟", { n: comp.length, m: comp.reduce((a, e) => a + (+e.minutes || 0), 0) })}，${topKinds(count(comp, e => e.kind), 5)}`);
  if (act.length) { const mins = act.reduce((m0, e) => { m0[e.kind] = (m0[e.kind] || 0) + (+e.minutes || 0); return m0; }, {}); L.push(`- ${t("活动")}：${Object.entries(mins).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${t(k)} ${v} ${t("分钟")}`).join("、")}`); }
  const potty = week.filter(e => e.type === "potty");
  if (potty.length) L.push(`- ${t("如厕")}：${t("{n} 次", { n: potty.length })}，${topKinds(count(potty, e => e.where), 4)}${potty.some(e => e.self) ? `，${t("自己提出 {n} 次", { n: potty.filter(e => e.self).length })}` : ""}`);
  const speech = week.filter(e => e.type === "speech");
  if (speech.length) L.push(`- ${t("语言")}：${topKinds(count(speech, e => e.kind), 5)}`);
  const habit = week.filter(e => e.type === "habit"), social = week.filter(e => e.type === "social");
  if (habit.length) L.push(`- ${t("自律")}：${topKinds(count(habit, e => e.kind), 6)}${habit.some(e => e.self) ? `，${t("自己做到 {n} 次", { n: habit.filter(e => e.self).length })}` : ""}`);
  if (social.length) L.push(`- ${t("社交")}：${topKinds(count(social, e => e.kind), 6)}`);
  const grow = all.filter(e => e.type === "baby" && (+e.weight || +e.length || +e.head)).sort((a, b) => b.ts - a.ts);
  if (grow.length) { const g = grow[0]; L.push(`- ${t("生长")}：${[+g.weight ? `${t("体重")} ${g.weight} kg` : "", +g.length ? `${t("身长")} ${g.length} cm` : "", +g.head ? `${t("头围")} ${g.head} cm` : ""].filter(Boolean).join("、")}（${dayKey(g.ts)}）${grow.length > 1 && +grow[1].weight && +g.weight ? `，${t("上一次 {w} kg（{d}）", { w: grow[1].weight, d: dayKey(grow[1].ts) })}` : ""}`); }
  const ms = all.filter(e => e.type === "milestone").sort((a, b) => b.ts - a.ts);
  if (ms.length) L.push(`- ${t("里程碑")}：${t("已记录 {n} 个", { n: ms.length })}，${t("最近：{k}", { k: ms.slice(0, 4).map(e => t(e.name || "")).filter(Boolean).join("、") })}`);
  const temps = week.filter(e => e.type === "baby" && +e.temp);
  if (temps.length) L.push(`- ${t("体温")}：${t("最近 {n} 次，最高 {v} ℃", { n: temps.length, v: Math.max(...temps.map(e => +e.temp)) })}`);
  if (stage.key === "newborn") {
    const body = S.entries.filter(e => e.type === "mbody").sort((a, b) => b.ts - a.ts)[0], meds = S.entries.filter(e => e.type === "mmed" && e.ts >= from);
    if (body) L.push(`- ${t("妈妈身体（最近一次 {d}）", { d: dayKey(body.ts) })}：${[+body.sleepHrs ? t("睡 {h} 小时", { h: body.sleepHrs }) : "", body.pain != null && body.pain !== "" ? t("疼痛 {v} / 10", { v: body.pain }) : "", +body.mood ? t("心情 {v} / 5", { v: body.mood }) : "", body.lochia ? `${t("恶露")} ${t(body.lochia)}` : "", +body.exercise ? t("恢复运动 {m} 分钟", { m: body.exercise }) : ""].filter(Boolean).join("、")}`);
    if (meds.length) L.push(`- ${t("妈妈用药")}：${t("最近 7 天 {n} 次", { n: meds.length })}，${topKinds(count(meds, e => e.cat), 4)}`);
  }
  if (L.length === 2) L.push(t("- 最近 7 天还没有记录"));
  return L.join("\n");
}
const SYSTEM = () => `你是一位谨慎、温和的儿童健康与育儿科普助手，用${answerLang()}回答父母的问题。
要求：依据美国儿科学会（AAP）、WHO、ACOG、CDC 等权威机构的公开建议，结合提供的记录摘要给出具体、可操作的建议；
控制在 300 字（英文 220 词）以内，分 2–4 个短段落，可以用 - 列表；不做诊断，不给具体药物剂量；
若问题或记录涉及危险信号（3 个月内发热 ≥38℃、呼吸困难、嗜睡难叫醒、脱水、产后大出血、胸痛、伤害自己或宝宝的念头等），第一句就明确建议立即就医。
最后一句提醒具体情况以医生意见为准。`;
const userText = () => `${A.ctx ? contextText() + "\n\n" : ""}问题：${A.q}`;
const promptText = () => `${SYSTEM()}\n\n${userText()}`;

/** 回答做最简渲染：转义后按行分段，- / 1. 开头的行做成列表，**粗体** */
function renderAnswer(text){
  const lines = esc(text).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").split("\n");
  let out = "", list = null;
  const flush = () => { if (list) { out += `<${list.tag}>${list.items.map(x => `<li>${x}</li>`).join("")}</${list.tag}>`; list = null; } };
  for (const ln of lines) {
    const m = ln.match(/^\s*(?:[-*•]|(\d+)[.、)])\s+(.*)$/);
    if (m) { const tag = m[1] ? "ol" : "ul"; if (!list || list.tag !== tag) { flush(); list = { tag, items: [] }; } list.items.push(m[2]); continue; }
    flush();
    if (ln.trim()) out += /^#+\s/.test(ln) ? `<h4>${ln.replace(/^#+\s/, "")}</h4>` : `<p>${ln}</p>`;
  }
  flush();
  return `<div class="ai-text">${out}</div>`;
}

/* ---- 页面 ---- */
function cfgHTML(){
  const d = A.draft, p = providerOf(d.provider), s = aiSettings();
  return `<div class="ai-cfg">
    <div class="lab">${t("服务商")}</div>
    <div class="chips" style="margin-top:4px">${PROVIDERS.map(x => `<button type="button" class="chip" data-act="ask-prov" data-v="${x.id}" aria-pressed="${d.provider === x.id}">${esc(t(x.name))}</button>`).join("")}</div>
    <p class="small muted" style="margin:0">${esc(t(p.hint || ""))}${p.signup ? ` <a href="${p.signup}" target="_blank" rel="noopener">${t("去申请 key")}</a>` : ""}</p>
    ${s.borrowed && !d.key ? `<p class="small muted">${t("现在沿用的是爱家小助手里填的 key；在这里填一个就改用自己的。")}</p>` : ""}
    <label class="small muted" for="askKey">API key</label><input id="askKey" type="password" autocomplete="off" value="${esc(d.key || "")}" placeholder="${t("只存在这台设备的浏览器里")}">
    <label class="small muted" for="askModel">${t("模型（留空用默认 {m}）", { m: p.model || "" })}</label><input id="askModel" type="text" autocomplete="off" value="${esc(d.model || "")}">
    ${p.id === "custom" ? `<label class="small muted" for="askBase">${t("接口地址（到 /v1 为止）")}</label><input id="askBase" type="url" autocomplete="off" value="${esc(d.base || "")}" placeholder="https://…/v1">` : ""}
    <div class="btns"><button class="btn primary" data-act="ask-save">${t("保存")}</button><button class="btn" data-act="ask-test">${t("测试连接")}</button><button class="btn" data-act="ask-cfg">${t("收起")}</button></div></div>`;
}
function viewAsk(){
  const ready = aiReady(), stage = stageOf().key;
  const topics = TOPICS.filter(x => !x.stages || x.stages.includes(stage));
  return `<h2>${aiIcon(26)} ${t("小Y问")} <span class="small muted" style="font-weight:400">${esc(childName())} · ${esc(ageText())}</span></h2>
  <p class="small muted">${ready ? t("直接问：喂奶、睡眠、辅食、情绪、陪伴、发育……会附上孩子最近 7 天记录的统计摘要（不含备注和姓名），答案就在下面出现。") : t("还没填 API key：点「复制提示词」会把问题连同记录摘要拼好，打开任一 AI 粘贴即可；填了 key 就能在这里直接出答案。")}</p>
  <div class="chips">${topics.map(x => `<button type="button" class="chip" data-act="ask-topic" data-v="${x.id}" aria-pressed="${A.topic === x.id}">${x.icon} ${esc(t(x.name))}</button>`).join("")}</div>
  <div class="panel ask">
    <textarea id="askq" rows="3" maxlength="1000" placeholder="${t("例如：夜里醒好几次正常吗？什么时候可以开始加辅食？")}">${esc(A.q)}</textarea>
    <label class="chk"><input type="checkbox" id="askctx" ${A.ctx ? "checked" : ""}> <span class="small">${t("附带最近 7 天的记录摘要（只有统计数字，不含备注和姓名）")}</span></label>
    <div class="btns">${ready ? `<button class="btn primary" data-act="ask-send" ${A.busy ? "disabled" : ""}>${A.busy ? t("思考中…") : t("发送")}</button>` : ""}
      <button class="btn ${ready ? "" : "primary"}" data-act="ask-copy">${t("复制提示词")}</button>
      <button class="btn" data-act="ask-cfg">${ready ? t("换模型") : t("填 API key")}</button></div>
    ${A.error ? `<p class="small" style="color:var(--rose);margin:8px 0 0" role="alert">${esc(A.error)}</p>` : ""}
    ${A.cfg ? cfgHTML() : ""}
  </div>
  ${ready ? "" : `<div class="panel"><p class="small muted" style="margin:0 0 8px">${t("复制后打开任一 AI 粘贴（手机上会直接打开已装的 App）：")}</p><div class="ai-sites">${SITES.map(([n, u]) => `<a class="chip" href="${u}" target="_blank" rel="noopener noreferrer">${esc(t(n))}</a>`).join("")}</div></div>`}
  ${A.answer ? `<div class="panel ai-answer"><div class="ai-head">${aiIcon(20)} <b>${t("小Y的回答")}</b><button class="chip" data-act="ask-copy-answer">${t("复制")}</button></div>${renderAnswer(A.answer)}
    <p class="small muted" style="margin:8px 0 0">${t("回答由 AI 生成，只作一般信息参考，不能代替医生诊断。")}</p></div>` : ""}
  <details class="more"><summary>${t("会发送什么")}<span class="small muted">${t("记录摘要原文")}</span></summary><div class="panel"><pre class="ai-ctx">${esc(contextText())}</pre></div></details>`;
}

/* ---- 事件（events.js 把 data-act 以 ask- 开头的都交到这里） ---- */
function readInputs(){
  const q = $("#askq"); if (q) A.q = q.value.trim();
  const c = $("#askctx"); if (c) A.ctx = c.checked;
  if (A.draft) { const k = $("#askKey"), m = $("#askModel"), b = $("#askBase"); if (k) A.draft.key = k.value.trim(); if (m) A.draft.model = m.value.trim(); if (b) A.draft.base = b.value.trim(); }
}
const copy = async (text, ok) => { try { await navigator.clipboard.writeText(text); toast(ok); } catch (e) { window.prompt(t("复制下面的文字"), text); } };
async function askAct(act, el){
  readInputs();
  switch (act) {
    case "ask-topic": { const tp = TOPICS.find(x => x.id === el.dataset.v); if (tp) { A.topic = tp.id; A.q = t(tp.q); } render(); const q = $("#askq"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } break; }
    case "ask-send": {
      if (!A.q) { A.error = t("先写一句要问的"); render(); break; }
      A.busy = true; A.error = null; render();
      ctl?.abort(); ctl = new AbortController();
      try { A.answer = await askText(SYSTEM(), userText(), { maxTokens: 1500, temperature: 0.4, signal: ctl.signal }); }
      catch (e) { A.error = e.message; }
      finally { A.busy = false; render(); }
      break; }
    case "ask-copy": if (!A.q) { A.error = t("先写一句要问的"); render(); break; } await copy(promptText(), t("提示词已复制，打开任一 AI 粘贴即可")); break;
    case "ask-copy-answer": if (A.answer) await copy(A.answer, t("已复制")); break;
    case "ask-cfg": { A.cfg = !A.cfg; if (A.cfg && !A.draft) { const s = aiSettings(); A.draft = { provider: s.provider, key: s.borrowed ? "" : s.key || "", model: s.model || "", base: s.base || "" }; } render(); break; }
    case "ask-prov": if (A.draft) { A.draft.provider = el.dataset.v; render(); } break;
    case "ask-save": if (A.draft) { saveAiSettings(A.draft); A.cfg = false; toast(t("已保存")); render(); } break;
    case "ask-test": {
      if (!A.draft) break; saveAiSettings(A.draft); el.disabled = true;
      try { await testAi(); toast(t("连接成功 ✓")); } catch (e) { toast(String(e.message || e).slice(0, 160)); }
      render(); break; }
    default: return false;
  }
  return true;
}

export { viewAsk, askAct, aiIcon, contextText, TOPICS };
