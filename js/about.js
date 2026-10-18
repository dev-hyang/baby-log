import { APPS, THIS_APP } from "./apps.js";
import { t } from "./i18n.js";
import { head, showSheet } from "./sheet.js";
import { APP_VERSION } from "./state.js";
import { $, esc } from "./util.js";

/* ============ about page: what the app is, how each page is used, what to watch out for ============
   Opened from the header (介绍 on wide screens, inside ⋮ on narrow ones) and from settings. The text lives
   here in simplified Chinese and is translated through the dictionaries like every other string. */
const ABOUT = {
  intro: "小月亮是一家人共用的宝宝日常记录：喂奶、尿布、睡眠、体温体重、疫苗、辅食、里程碑，以及妈妈产后的用药和身体状况。它按孩子的年龄自动切换阶段（新生儿 → 婴儿 → 幼儿 → 学前），首页按钮、统计和参考内容跟着变。它是家庭学堂、爱家小助手的姐妹应用，三个站点共用同一个账号和家庭。",
  principles: [
    ["两秒记一条", "首页的快捷按钮一键打开表单，默认值记住上次的选择，保存后立刻回到首页。夜里喂奶可以切到深色模式。"],
    ["全家一本账", "一个家庭一份数据，谁记的都看得见、都能改。创建家庭的人用邮箱注册，其他家人输入邀请码就能加入，不用注册。"],
    ["没网也照常用", "记录先存在手机里，联网后自动同步；每条记录带服务器时间戳，同一条记录以后改的为准。"],
    ["参考不替代医生", "喂奶次数、尿布数量、睡眠时长、里程碑、体检时间表等参考值来自 AAP、CDC、WHO 的公开建议，只用来提醒，不做诊断。"],
    ["数据格式统一", "选项值不随语言和单位改变：妈妈看中文公制、爸爸看英文美制，底下是同一份记录。"]
  ],
  pages: [
    ["今天", "顶部是距上次喂奶的计时（幼儿期起是距上次吃饭），宝宝在睡时变成已睡时长并可一键记醒来。下面是按阶段变化的快捷按钮、最近 24 小时统计（带参考值）、妈妈用药计时、下次体检提醒和当天的记录。"],
    ["记录", "三种视图：按餐表格一餐一行，尿布、睡眠、用药归到两餐之间，点 ○ 直接打勾；趋势对比按天看 14 天或按周看 8 周，并列出今天和昨天的差别；时间线可搜索、按类型筛选、补记过去的记录。"],
    ["妈妈", "产后恢复：用药计时（最短间隔按医嘱填在设置里）、体重、疼痛与心情曲线，以及 CDC「Hear Her」产后紧急警示信号。新生儿期一直显示，之后只要最近 30 天有妈妈记录也会显示。"],
    ["成长", "成长阶段、CDC 里程碑参考（点一下就记录）、新食物与反应、最近 7 天睡眠分布、睡眠参考、体重身高曲线、儿科体检提醒与历史记录、疫苗接种记录。"],
    ["问答", "什么时候要联系儿科医生（按阶段）、向 AI 提问（只在支持的打开方式下可用）、权威资料和公众号。"],
    ["设置", "孩子（可以有多个，点页面顶部的名字切换）、妈妈用药间隔、家庭协作、备份导出与恢复、语言、单位、显示、姐妹应用。"]
  ],
  tips: [
    "亲喂时表单会按上一次喂的那一侧，建议这次先喂另一侧。",
    "睡眠：点「开始睡」只记入睡时间，醒了在首页点「醒了，记录结束」；中间可以关掉网页。",
    "有多个孩子时，一起做的活动可以多选孩子，会各记一条。",
    "宝宝健康的来源选「儿科体检」会自动勾选对应的体检提醒；成长页的历史记录和「就医记录」打印页可以带去医院。",
    "补记：时间线里点「＋ 补记一条」，时间可以改到过去任何时刻。",
    "打印：右上角「打印」（窄屏在 ⋮ 菜单里）可以打按餐表格、趋势对比、时间线和就医记录。",
    "家主可以重置邀请码、修改家人称呼、把家人设为家主或移出家庭。"
  ],
  caveats: [
    "这不是医疗设备。应用里的红色提示只是提醒：3 个月内体温 ≥ 38℃、呼吸困难、嗜睡难叫醒、脱水、产后大出血、有伤害自己或宝宝的念头，请立即联系医生或急诊。",
    "邀请码相当于家门钥匙，只发给信任的人。有人误加入时，家主可以把对方移出并重置邀请码。",
    "用邀请码加入的设备没有绑定邮箱：清理浏览器数据后需要再输一次邀请码。创建家庭的人请记住邮箱和密码，换手机时用它找回家庭。",
    "没有加入家庭时，记录只保存在这台设备的浏览器里，建议每周导出一次备份。",
    "AI 回答只是一般信息，具体情况以医生意见为准。"
  ],
  data: "记录保存在 Supabase（家庭云端），数据库的行级权限保证只有本家庭的成员能读写；手机上保留一份离线副本和显示偏好（语言、单位、主题、当前看哪个孩子）。除了登录用的邮箱之外不收集个人信息，没有统计埋点和广告。随时可以在设置里导出全部数据（JSON）。"
};

function openAbout(){
  const A = ABOUT;
  $("#sheetIn").innerHTML = `${head(t("关于小月亮"))}
  <p>${t(A.intro)}</p>
  <h2>${t("设计原则")}</h2>
  <div class="panel"><ol class="plain" style="padding-left:20px">${A.principles.map(([k, d]) => `<li style="margin:6px 0"><b>${t(k)}</b> ${t(d)}</li>`).join("")}</ol></div>
  <h2>${t("每一页怎么用")}</h2>
  <div class="panel scroll-x"><table><tbody>${A.pages.map(([p, d]) => `<tr><th style="width:18%">${t(p)}</th><td>${t(d)}</td></tr>`).join("")}</tbody></table></div>
  <h2>${t("小技巧")}</h2>
  <div class="panel"><ul class="plain">${A.tips.map(s => `<li>${t(s)}</li>`).join("")}</ul></div>
  <h2>${t("注意事项")}</h2>
  <div class="panel"><ul class="plain">${A.caveats.map(s => `<li>${t(s)}</li>`).join("")}</ul></div>
  <h2>${t("数据与隐私")}</h2>
  <div class="panel"><p class="small">${t(A.data)}</p>
    <p class="small muted">${t("姐妹应用：")}${APPS.filter(a => a.key !== THIS_APP).map(a => `<a href="${a.url}">${esc(t(a.name))}</a>`).join(" · ")} · ${t("版本 {v}", { v: APP_VERSION })}</p></div>`;
  showSheet("about");
}

export { ABOUT, openAbout };
