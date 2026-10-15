import { ask } from "./ask.js";
import { byTime, expectedDiapers, last, medStatus, sleepMsIn, suggestSide, within } from "./derived.js";
import { viewMeal } from "./meal.js";
import { CHECKUPS, S, STAGES, ageText, babyAgeDays, birthTs, checkupDate, checkupsDone, child, nextCheckup, vis } from "./state.js";
import { SB, loadTombs } from "./sync.js";
import { viewTrend } from "./trend.js";
import { TYPES, flags, summary } from "./types.js";
import { isUS, toDisp, trim, unitOf } from "./units.js";
import { $, D, H, dayKey, dur, esc, hm, num, startOfDay, weekday } from "./util.js";

/* ============ rendering ============ */
function renderStatus(){
  const pending = S.entries.filter(e => e._dirty).length + loadTombs().length;
  $("#status").innerHTML = S.mode === "family"
    ? (pending ? `<span class="dot"></span>${pending} 条待同步` : `<span class="dot ok"></span>家庭同步 · ${Object.keys(SB.members).length || 1} 人`)
    : S.mode === "cloud" ? `<span class="dot ok"></span>已同步到你的账号` : `<span class="dot"></span>保存在本设备`;
  $("#bname").innerHTML = `${esc(child().name ? `${child().name}的记录` : "小月亮")}<span class="chev" aria-hidden="true"></span>`;
  $("#bage").textContent = ageText();
  $("#kids").innerHTML = S.settings.children.map(c => `<button role="menuitemradio" aria-checked="${c.id === S.childId}" data-kidsel="${esc(c.id)}"><b>${esc(c.name || "宝宝")}</b><small>${esc(ageText(c.id))}</small></button>`).join("")
    + `<button class="manage" role="menuitem" data-act="settings">管理孩子…</button>`;
}
function toggleKids(open = $("#kids").hidden){
  $("#kids").hidden = !open;
  $("#bname").setAttribute("aria-expanded", String(open));
  if (open) { const cur = $("#kids [aria-checked='true']"); cur && cur.focus(); }
}
function render(){
  renderStatus();
  document.querySelectorAll("nav.tabs button").forEach(b => { if (b.dataset.tab === S.tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  const v = { today: viewToday, log: viewLog, mom: viewMom, grow: viewGrow, learn: viewLearn }[S.tab];
  $("#main").innerHTML = v();
  if (S.tab === "log") { const s = $("#q"); if (s && document.activeElement !== s && S.logFocus) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); S.logFocus = false; } }
}

function heroHTML(){
  const sl = last(e => e.type === "sleep" && !e.end);
  if (sl) return `<section class="hero sleeping" aria-live="polite"><div class="moon"></div>
    <div class="lbl">宝宝已经睡了</div>
    <div class="big num">${bigDur(Date.now() - sl.ts)}</div>
    <div class="meta"><span>${hm(sl.ts)} 入睡</span>${sl.where ? `<span>${esc(sl.where)}</span>` : ""}</div>
    <div class="act"><button data-act="wake" data-id="${sl.id}">醒了，记录结束</button></div></section>`;
  const f = last(e => e.type === "feed" && e.method !== "吸奶");
  if (!f) return `<section class="hero"><div class="moon"></div><div class="lbl">距上次喂奶</div>
    <div class="big num">--<small>:</small>--</div><div class="meta">点下面的按钮记录第一次喂奶</div></section>`;
  const side = suggestSide(f);
  return `<section class="hero"><div class="moon"></div>
    <div class="lbl">距上次喂奶</div>
    <div class="big num">${bigDur(Date.now() - f.ts)}</div>
    <div class="meta"><span>${hm(f.ts)} · ${esc(summary(f))}</span>${side ? `<span>这次建议先喂 <span class="side">${side}</span></span>` : ""}</div></section>`;
}
function bigDur(ms){ const m = Math.max(0, Math.floor(ms / 60000)); const h = Math.floor(m / 60); return h ? `${h}<small>小时</small>${m % 60}<small>分</small>` : `${m}<small>分钟</small>`; }

function viewToday(){
  const day = within(D);
  const feeds = day.filter(e => e.type === "feed" && e.method !== "吸奶");
  const ml = feeds.reduce((a, e) => a + (+e.ml || 0), 0);
  const L = feeds.reduce((a, e) => a + (+e.left || 0), 0), R = feeds.reduce((a, e) => a + (+e.right || 0), 0);
  const wet = day.filter(e => e.type === "diaper" && e.pee).length, poop = day.filter(e => e.type === "diaper" && e.poop).length;
  const exp = expectedDiapers(babyAgeDays());
  const sleep = sleepMsIn(Date.now() - D, Date.now());
  const alerts = within(2 * D).flatMap(e => flags(e).map(t => ({ t, e })));
  const nc = nextCheckup();
  const meds = medStatus();
  const today = vis().filter(e => e.ts >= startOfDay(Date.now())).sort(byTime);
  const newborn = (babyAgeDays() ?? 0) < 91;

  return `
  ${heroHTML()}
  <div class="quick" role="group" aria-label="快速记录">
    <button data-add="feed" data-preset='{"method":"亲喂"}'><i>🤱</i>亲喂</button>
    <button data-add="feed" data-preset='{"method":"母乳瓶喂"}'><i>🍼</i>瓶喂母乳</button>
    <button data-add="feed" data-preset='{"method":"配方奶"}'><i>🥛</i>配方奶</button>
    <button data-add="diaper"><i>🧷</i>换尿布</button>
    <button data-act="sleepnow"><i>🌙</i>开始睡</button>
    <button data-add="mmed"><i>💊</i>妈妈用药</button>
    <button data-add="mbody"><i>♡</i>妈妈身体</button>
    <button data-add="baby"><i>🌡</i>宝宝健康</button>
  </div>
  ${alerts.map(a => `<div class="alert red" role="alert"><b>需要留意</b> · ${hm(a.e.ts)} ${esc(a.t)}</div>`).join("")}

  <h2>最近 24 小时</h2>
  <div class="stats">
    <div class="stat"><div class="k">喂奶次数</div><div class="v num">${feeds.length}<small>次</small></div>
      ${newborn ? `<div class="ref ${feeds.length && feeds.length < 8 ? "warn" : ""}">新生儿通常 8–12 次</div>` : ""}</div>
    <div class="stat"><div class="k">瓶喂总量</div><div class="v num">${trim(toDisp("vol", ml), isUS() ? 1 : 0)}<small>${unitOf("vol")}</small></div></div>
    <div class="stat"><div class="k">亲喂 左 / 右</div><div class="v num">${L}<small>分</small> ${R}<small>分</small></div></div>
    <div class="stat"><div class="k">湿尿布 / 大便</div><div class="v num">${wet}<small>次</small> ${poop}<small>次</small></div>
      ${birthTs() && newborn ? `<div class="ref ${wet < exp.wet ? "warn" : ""}">参考：至少 ${exp.wet} 次湿尿布${exp.poop ? `、${exp.poop} 次大便` : ""}</div>` : ""}</div>
    <div class="stat"><div class="k">宝宝睡眠</div><div class="v num">${Math.round(sleep / H * 10) / 10}<small>小时</small></div></div>
  </div>

  ${meds.length ? `<h2>妈妈用药</h2><div class="panel">${meds.map(medRow).join("")}
     <p class="small muted" style="margin-top:8px">间隔来自你在设置里填写的医嘱。没有填写的只显示距上次服药多久。</p></div>` : ""}

  ${nc ? `<div class="alert info" style="margin-top:14px">${nc.at < Date.now() ? "儿科体检" : "下次儿科体检"}：<b>${nc.label}</b>，${nc.at < Date.now() ? "应在" : "约"} ${dayKey(nc.at)}（${weekday(nc.at)}）${nc.at < Date.now() ? "，去过了记得在成长页勾选" : ""}。<button class="chip" data-tab="grow" style="margin-left:6px">查看全部</button></div>` : ""}

  <h2>今天</h2>
  ${today.length ? today.map(entryRow).join("") : `<div class="empty">今天还没有记录。</div>`}
  ${!S.entries.length ? `<div class="empty">想先看看效果？<br><button class="btn" data-act="demo">载入演示数据</button></div>` : ""}`;
}
function medRow(m){
  let pill = "";
  if (m.next) pill = m.next > Date.now() ? `<span class="pill wait">${hm(m.next)} 后可再服</span>` : `<span class="pill ok">已过医嘱间隔</span>`;
  return `<div class="medrow"><div><b>${esc(m.name)}</b><div class="small muted">上次 ${hm(m.at)} · ${dur(Date.now() - m.at)}前 · 24小时内 ${m.count24} 次</div></div>${pill}</div>`;
}
function entryRow(e){
  const T = TYPES[e.type] || { color: "var(--muted)", label: e.type };
  const fl = flags(e);
  return `<button class="entry" data-edit="${e.id}">
    <span class="t">${hm(e.ts)}</span><span class="c" style="background:${T.color}" aria-hidden="true"></span>
    <span><span class="s">${esc(T.label)} · ${esc(summary(e))}</span>${S.mode === "family" && e.by && SB.members[e.by] ? `<span class="n"> · ${esc(SB.members[e.by])}</span>` : ""}${e.note ? `<br><span class="n">${esc(e.note)}</span>` : ""}${fl.map(f => `<br><span class="n" style="color:var(--rose)">${esc(f)}</span>`).join("")}</span></button>`;
}

function viewLog(){
  const views = [["meal", "按餐表格"], ["trend", "趋势对比"], ["list", "时间线"]];
  const sw = `<div class="vtabs" role="group" aria-label="记录视图">${views.map(([k, l]) => `<button data-logview="${k}" aria-pressed="${S.logView === k}">${l}</button>`).join("")}</div>`;
  if (S.logView === "meal") return sw + viewMeal();
  if (S.logView === "trend") return sw + viewTrend();
  return sw + viewList();
}

function viewList(){
  const q = S.q.trim().toLowerCase();
  let list = vis().sort(byTime);
  if (S.filter !== "all") list = list.filter(e => S.filter === "momall" ? ["mmed", "mbody"].includes(e.type) : e.type === S.filter);
  if (q) list = list.filter(e => (TYPES[e.type]?.label + " " + summary(e) + " " + (e.note || "") + " " + dayKey(e.ts)).toLowerCase().includes(q));
  const groups = {};
  for (const e of list) (groups[dayKey(e.ts)] ||= []).push(e);
  const chips = [["all", "全部"], ["feed", "喂奶"], ["diaper", "尿布"], ["sleep", "睡眠"], ["baby", "宝宝健康"], ["bmed", "宝宝用药"], ["vax", "疫苗"], ["momall", "妈妈"]];
  return `<label for="q" class="small muted">搜索备注、药名、日期（如 2026-10-11）</label>
  <input id="q" class="search" type="search" value="${esc(S.q)}" placeholder="搜索…" autocomplete="off">
  <div class="chips" role="group" aria-label="按类型筛选">${chips.map(([k, l]) => `<button class="chip" data-filter="${k}" aria-pressed="${S.filter === k}">${l}</button>`).join("")}</div>
  <div class="btns" style="margin-top:0"><button class="btn" data-act="addpick">＋ 补记一条</button></div>
  ${Object.keys(groups).length ? Object.entries(groups).map(([d, es]) => `<div class="day">${d} ${weekday(es[0].ts)} · ${es.length} 条</div>${es.map(entryRow).join("")}`).join("")
   : `<div class="empty">${q || S.filter !== "all" ? "没有符合条件的记录，换个关键词试试。" : "还没有记录。回到“今天”开始记第一条。"}</div>`}`;
}

/* ---- charts ---- */
function lineChart(points, opts){
  const W = 360, Hh = 150, P = { l: 34, r: 10, t: 12, b: 22 };
  if (points.length < 2) return `<p class="small muted">至少记录两次后会显示趋势图。</p>`;
  const xs = points.map(p => p.t), ys = points.map(p => p.v);
  let y0 = Math.min(...ys), y1 = Math.max(...ys); if (opts.min != null) y0 = Math.min(y0, opts.min); if (opts.max != null) y1 = Math.max(y1, opts.max);
  if (y1 === y0) { y1 += 1; y0 -= 1; }
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
  const X = t => P.l + (t - x0) / ((x1 - x0) || 1) * (W - P.l - P.r), Y = v => Hh - P.b - (v - y0) / (y1 - y0) * (Hh - P.t - P.b);
  const path = points.map((p, i) => (i ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.v).toFixed(1)).join(" ");
  const fmt = v => Math.round(v * 10) / 10;
  return `<div class="scroll-x"><svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="${esc(opts.label)}：从 ${fmt(ys[0])} 到 ${fmt(ys[ys.length - 1])}${esc(opts.unit)}">
    <line x1="${P.l}" x2="${W - P.r}" y1="${Y(y1)}" y2="${Y(y1)}" stroke="var(--line)"/><line x1="${P.l}" x2="${W - P.r}" y1="${Y(y0)}" y2="${Y(y0)}" stroke="var(--line)"/>
    <text x="4" y="${Y(y1) + 4}">${fmt(y1)}</text><text x="4" y="${Y(y0) + 4}">${fmt(y0)}</text>
    <text x="${P.l}" y="${Hh - 6}">${dayKey(x0).slice(5)}</text><text x="${W - P.r}" y="${Hh - 6}" text-anchor="end">${dayKey(x1).slice(5)}</text>
    <path d="${path}" fill="none" stroke="${opts.color}" stroke-width="2.5" stroke-linejoin="round"/>
    ${points.map(p => `<circle cx="${X(p.t)}" cy="${Y(p.v)}" r="3.5" fill="${opts.color}"/>`).join("")}</svg></div>`;
}
function sleepBarcode(){
  const W = 360, rowH = 20, gap = 6, L = 42, days = 7, now = Date.now();
  const rows = []; for (let i = 0; i < days; i++) rows.push(startOfDay(now) - i * D);
  const all = vis();
  const sleeps = all.filter(e => e.type === "sleep");
  const feeds = all.filter(e => e.type === "feed" && e.method !== "吸奶");
  const scale = (W - L - 8) / D;
  let body = "";
  rows.forEach((d0, i) => {
    const y = 18 + i * (rowH + gap);
    body += `<text x="0" y="${y + 15}">${dayKey(d0).slice(5)}</text><rect x="${L}" y="${y}" width="${W - L - 8}" height="${rowH}" rx="4" fill="var(--slate-soft)"/>`;
    for (const s of sleeps) { const a = Math.max(s.ts, d0), b = Math.min(s.end || now, d0 + D); if (b > a) body += `<rect x="${(L + (a - d0) * scale).toFixed(1)}" y="${y}" width="${Math.max(1.5, (b - a) * scale).toFixed(1)}" height="${rowH}" rx="3" fill="var(--slate)"/>`; }
    for (const f of feeds) if (f.ts >= d0 && f.ts < d0 + D) body += `<rect x="${(L + (f.ts - d0) * scale - 1).toFixed(1)}" y="${y + rowH - 6}" width="3" height="6" fill="var(--honey)"/>`;
  });
  [0, 6, 12, 18, 24].forEach(h => body += `<text x="${L + h * H * scale}" y="12" text-anchor="${h === 0 ? "start" : h === 24 ? "end" : "middle"}">${h}点</text>`);
  const total = 18 + days * (rowH + gap);
  return `<div class="scroll-x"><svg viewBox="0 0 ${W} ${total}" width="100%" role="img" aria-label="最近7天睡眠时间分布图，深色为睡眠，黄色刻度为喂奶">${body}</svg></div>
  <div class="legend"><span style="--c:var(--slate)">睡眠</span><span style="--c:var(--honey)">喂奶</span></div>`;
}

function viewMom(){
  const meds = medStatus();
  const bodies = S.entries.filter(e => e.type === "mbody").sort((a, b) => a.ts - b.ts);
  const wpts = bodies.filter(e => num(e.weight) != null).map(e => ({ t: e.ts, v: toDisp("wmom", e.weight) }));
  const ppts = bodies.filter(e => num(e.pain) != null).map(e => ({ t: e.ts, v: +e.pain }));
  const mpts = bodies.filter(e => num(e.mood) != null).map(e => ({ t: e.ts, v: +e.mood }));
  const lowMood = mpts.slice(-5).filter(p => p.v <= 2).length >= 3;
  return `<h2>妈妈的恢复</h2>
  <div class="btns" style="margin-top:0"><button class="btn primary" data-add="mbody">记录今天的身体状况</button><button class="btn" data-add="mmed">记录用药</button></div>
  ${lowMood ? `<div class="alert info">最近几次心情记录偏低。产后情绪波动很常见，但如果低落持续超过两周，或影响到吃饭、睡觉、照顾宝宝，值得和医生聊聊产后抑郁筛查（如 EPDS 量表）。</div>` : ""}
  <h2>用药计时</h2>
  <div class="panel">${meds.length ? meds.map(medRow).join("") : `<p class="muted">最近 48 小时没有用药记录。</p>`}
    <p class="small muted" style="margin-top:8px">在“设置”里给每种药填上医生或说明书给的最短间隔，这里就会显示下次可以服用的时间。哺乳期用药请先确认医生的意见。</p></div>
  <h2>体重（${unitOf("wmom")}）</h2><div class="panel">${lineChart(wpts, { color: "#9B7BB8", unit: unitOf("wmom"), label: "妈妈体重" })}</div>
  <h2>疼痛与心情</h2>
  <div class="panel"><h3 class="small muted">疼痛 0–10</h3>${lineChart(ppts, { color: "var(--rose)", unit: "", label: "疼痛评分", min: 0, max: 10 })}
    <h3 class="small muted" style="margin-top:10px">心情 1–5</h3>${lineChart(mpts, { color: "var(--sage)", unit: "", label: "心情评分", min: 1, max: 5 })}</div>
  <h2>需要立即就医的警示信号</h2>
  <div class="panel"><p class="small muted">参考美国 CDC “Hear Her” 产后紧急警示信号。出现任何一项，请马上联系医生或去急诊。</p>
  <ul class="plain">
    <li>持续不缓解或越来越重的头痛，头晕、晕厥</li>
    <li>视力变化（看东西模糊、眼前闪光）</li>
    <li>体温 38℃（100.4℉）或以上</li>
    <li>面部、手部严重肿胀</li>
    <li>有伤害自己或宝宝的想法</li>
    <li>呼吸困难、胸痛、心跳很快</li>
    <li>剧烈腹痛、持续恶心呕吐</li>
    <li>出血量大（约 1 小时浸透一片卫生巾）或排出大血块</li>
    <li>一侧腿部肿胀、发红、疼痛</li>
    <li>极度疲惫、无法照顾自己</li>
  </ul></div>`;
}

function viewGrow(){
  const ad = babyAgeDays();
  const cur = ad == null ? -1 : STAGES.findIndex(s => ad < s.untilDays);
  const w = vis().filter(e => e.type === "baby" && num(e.weight) != null).sort((a, b) => a.ts - b.ts).map(e => ({ t: e.ts, v: toDisp("wbaby", e.weight) }));
  const done = checkupsDone();
  return `<h2>成长阶段</h2>
  <div class="stages">${STAGES.map((s, i) => `<div class="stage ${i === cur ? "now" : ""}"><b>${s.name}</b>${s.range}${i > 0 ? `<ul>${s.items.map(x => `<li>${x}</li>`).join("")}</ul>` : `<ul>${s.items.map(x => `<li>${x}</li>`).join("")}</ul>`}</div>`).join("")}</div>
  <p class="small muted" style="margin-top:6px">${cur >= 0 ? `现在是「${STAGES[cur].name}」。后面阶段的记录模块会陆续加上。` : "在设置里填写宝宝生日后，会自动定位到当前阶段。"}</p>

  <h2>最近 7 天睡眠</h2>
  <div class="panel">${sleepBarcode()}
    <p class="small muted" style="margin-top:8px">每一行是一天，从 0 点到 24 点。看得出白天和夜里的睡眠慢慢分开，就是作息在形成。</p></div>

  <h2>睡眠参考</h2>
  <div class="panel scroll-x"><table>
    <thead><tr><th>月龄</th><th>24小时总睡眠</th><th>常见清醒时长</th></tr></thead>
    <tbody>
      <tr><td>0–3 个月</td><td>14–17 小时</td><td>45–90 分钟</td></tr>
      <tr><td>4–12 个月</td><td>12–16 小时（含小睡）</td><td>1.5–3.5 小时</td></tr>
      <tr><td>1–2 岁</td><td>11–14 小时（含小睡）</td><td>3–5 小时</td></tr>
      <tr><td>3–5 岁</td><td>10–13 小时（含小睡）</td><td>多数逐渐不午睡</td></tr>
    </tbody></table>
    <p class="small muted" style="margin-top:8px">总睡眠：4个月以上为美国睡眠医学会（AASM）建议、AAP 认可；0–3 个月为美国国家睡眠基金会建议。清醒时长是常见经验范围，个体差异很大。安全睡眠：仰睡、独自睡在婴儿床、床里不放枕头被子毛绒玩具。多数专家建议约 4–6 个月后再考虑睡眠训练。</p></div>

  <h2>宝宝体重（${unitOf("wbaby")}）</h2><div class="panel">${lineChart(w, { color: "var(--sky)", unit: unitOf("wbaby"), label: "宝宝体重" })}
    <p class="small muted">新生儿出生后几天体重下降常见；通常约 10–14 天回到出生体重。是否正常请以儿科医生对照生长曲线的判断为准。</p>
    <div class="btns"><button class="btn" data-add="baby">记录体重 / 身长 / 头围</button></div></div>

  <h2>儿科体检提醒</h2>
  <div class="panel scroll-x">${birthTs() ? `<table><thead><tr><th>时间点</th><th>约在</th><th>完成</th></tr></thead><tbody>
    ${CHECKUPS.map(c => { const at = checkupDate(c); const soon = !done[c.k] && at > Date.now() - 14 * D && at < Date.now() + 21 * D;
      return `<tr><td>${soon ? "<b>" : ""}${c.label}${soon ? "</b>" : ""}</td><td class="num">${dayKey(at)}</td>
      <td><label class="check"><input type="checkbox" data-checkup="${c.k}" ${done[c.k] ? "checked" : ""}><span class="small">已去</span></label></td></tr>`; }).join("")}
    </tbody></table>
    <p class="small muted" style="margin-top:8px">时间点参考美国儿科学会 Bright Futures 体检时间表。疫苗按当地（中国 / 美国等）免疫规划和医生安排，二者时间不完全相同。</p>`
    : `<p class="muted">在设置里填写宝宝生日后，会自动算出每次体检的大概日期。</p><button class="btn" data-act="settings">去填写</button>`}</div>
  ${vaxHTML()}`;
}
function vaxHTML(){
  const list = vis().filter(e => e.type === "vax" || (e.type === "bmed" && e.cat === "疫苗")).sort((a, b) => a.ts - b.ts);
  const ageAt = ts => { const d = babyAgeDays(ts); if (d == null) return ""; return d < 60 ? `${d + 1}天` : `${Math.floor(d / 30.44)}月龄`; };
  return `<h2>疫苗接种记录</h2>
  <div class="panel">
    ${list.length ? `<div class="scroll-x"><table><thead><tr><th>日期</th><th>疫苗</th><th>剂次</th><th>部位</th><th>反应</th></tr></thead><tbody>
      ${list.map(e => `<tr><td class="num"><button class="cellbtn" style="all:unset;cursor:pointer" data-edit="${e.id}" aria-label="修改 ${dayKey(e.ts)} 的接种记录">${dayKey(e.ts)}</button><br><span class="small muted">${ageAt(e.ts)}</span></td>
        <td>${esc(e.name || e.cat || "")}</td><td>${esc(e.dose || "")}</td><td>${esc(e.site || "")}</td><td>${esc(e.reaction || "")}</td></tr>`).join("")}
    </tbody></table></div><p class="small muted" style="margin-top:6px">共 ${list.length} 次。点日期可修改。</p>`
    : `<p class="muted">还没有接种记录。打完疫苗后记一笔，看儿科或办入学时翻出来很方便。</p>`}
    <div class="btns"><button class="btn" data-add="vax">＋ 记录一次接种</button></div>
    <p class="small muted" style="margin-top:8px">这里是家庭自己的备份，正式凭证仍以接种本、医院系统或学校要求的官方记录为准。</p>
  </div>`;
}

function viewLearn(){
  const ad = babyAgeDays();
  return `<h2>什么时候要联系儿科医生</h2>
  <div class="panel"><ul class="plain">
    <li><b>3 个月以内</b>体温 ≥ 38℃（100.4℉）：立即联系医生或去急诊，不要先自行用退烧药。</li>
    <li>呼吸急促、费力，嘴唇发青，或很难叫醒、异常软。</li>
    <li>湿尿布明显变少（出生第 5 天后 24 小时少于 6 次），嘴唇干、哭时无泪。</li>
    <li>皮肤或眼白越来越黄，尤其蔓延到腹部和腿，或出生 24 小时内就发黄。</li>
    <li>大便灰白色、带血，或持续喷射性呕吐、呕吐物呈绿色。</li>
    <li>连续几次拒奶，或体重没有按医生预期回升。</li>
    <li>脐带周围红肿、有臭味或流脓。</li>
  </ul><p class="small muted">整理自美国儿科学会家长网站 HealthyChildren.org 的常见建议。不确定时，打电话问医生总是对的。</p></div>

  <h2>问一个问题</h2>
  <div class="panel ask">${S.sample ? `
    <label for="askq" class="small muted">比如：“宝宝打嗝很多正常吗？”“产后多久可以开始运动？”</label>
    <textarea id="askq" placeholder="输入你的问题…"></textarea>
    <div class="btns"><button class="btn primary" data-act="ask">提问</button></div>
    <div class="answer" id="answer" aria-live="polite"></div>
    <p class="small muted" style="margin-top:8px">回答由 AI 生成，只作一般信息参考，不能代替医生诊断。</p>`
    : `<p class="muted">在线问答在当前打开方式下不可用。可以先查看下方的权威网站。</p>`}</div>

  <h2>权威资料</h2>
  <div class="panel"><ul class="plain">
    <li><a href="https://www.healthychildren.org" target="_blank" rel="noopener">HealthyChildren.org</a>（美国儿科学会家长站，有中文版部分内容）</li>
    <li><a href="https://www.cdc.gov/ncbddd/actearly/milestones/index.html" target="_blank" rel="noopener">CDC 发育里程碑 Learn the Signs. Act Early.</a></li>
    <li><a href="https://www.cdc.gov/hearher/" target="_blank" rel="noopener">CDC Hear Her 产后警示信号</a></li>
    <li><a href="https://www.who.int/health-topics/breastfeeding" target="_blank" rel="noopener">WHO 母乳喂养</a></li>
    <li><a href="https://www.who.int/tools/child-growth-standards" target="_blank" rel="noopener">WHO 儿童生长标准曲线</a></li>
  </ul></div>

  <h2>微信公众号</h2>
  <div class="panel"><p class="small muted">网页无法直接搜索公众号。点“复制”后到微信里搜索。内容质量请自行判断，医疗问题以医生意见为准。</p>
    ${["丁香妈妈", "崔玉涛育学园", "年糕妈妈"].map(n => `<div class="medrow"><span>${n}</span><button class="chip" data-copy="${n}">复制名称</button></div>`).join("")}</div>`;
}

export { renderStatus, render, toggleKids, heroHTML, bigDur, viewToday, medRow, entryRow, viewLog, viewList, lineChart, sleepBarcode, viewMom, viewGrow, vaxHTML, viewLearn };
