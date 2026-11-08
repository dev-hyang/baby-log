/* ============ 发布日志的数据：每次发布（每次 push）一条，最新的在最上面 ============
   v = APP_VERSION（js/state.js），日期取自版本号；title = 一句话简介；items = 要点，k: new 新功能 / better 改进 / fix 修复。
   写给家长看：短、口语，不用技术词。显示由 js/releases-ui.js 负责（我的 → 发布日志、今天页顶上的新版本提示）。 */
export const RELEASES = [
  { v: "2026-11-08.4", title: { zh: "新增「发布日志」：看看每次更新了什么", en: "New: release notes for every update" }, items: [
    { k: "new", zh: "我的 → 发布日志：每个版本的新功能、改进和修复", en: "Me → Release notes: what's new, improved and fixed in each version" },
    { k: "new", zh: "有新版本时，今天页顶上会提示几次，点开就能看", en: "After an update, Today shows a short notice a few times; tap to read" },
    { k: "better", zh: "点页头右上角的版本号，也能打开发布日志", en: "Tap the version number at the top right to open the release notes" }
  ] },
  { v: "2026-11-08.3", title: { zh: "音乐卡更清楚，和家庭学堂一样好用", en: "A clearer music card, same as in Homeschool" }, items: [
    { k: "better", zh: "上面选声音还是儿歌、定时关，下面一个下拉框挑曲子", en: "Pick sounds or songs and a timer on top, then one menu to choose the track" },
    { k: "better", zh: "宝宝助眠声音一直循环播放", en: "Baby sleep sounds always loop" },
    { k: "fix", zh: "音乐卡不再超出卡片宽度", en: "The music card no longer spills past the card's width" }
  ] },
  { v: "2026-11-08.2", title: { zh: "宝宝睡着时，顶部停在睡眠卡", en: "While the baby sleeps, the top stays on the sleep card" }, items: [
    { k: "better", zh: "睡着时不再自动翻到别的卡片，手动左右滑照样可以", en: "No automatic flipping while asleep; you can still swipe by hand" }
  ] },
  { v: "2026-11-08.1", title: { zh: "顶部卡片：睡着时睡眠计时排第一", en: "Top cards: the sleep timer comes first while asleep" }, items: [
    { k: "better", zh: "睡着时第一张是睡眠计时，其他卡片照样能滑到", en: "While asleep the sleep timer is first; the other cards are still a swipe away" },
    { k: "new", zh: "卡片下方有进度短线和 ‹ › 按钮，⚙ 里能调翻页时间", en: "Progress dashes and ‹ › under the cards; set the flip time under ⚙" },
    { k: "better", zh: "音乐卡和计时卡一样高，不再忽高忽低", en: "The music card is now the same height as the timer cards" }
  ] },
  { v: "2026-11-07.2", title: { zh: "音乐卡重新设计，关了屏幕也能继续放", en: "Music card redesigned; keeps playing with the screen off" }, items: [
    { k: "better", zh: "音乐卡排得更清楚，按钮更大更好点", en: "A tidier music card with bigger, easier buttons" },
    { k: "better", zh: "宝宝助眠声音关掉屏幕也能继续播放", en: "Baby sleep sounds keep playing with the screen off" },
    { k: "better", zh: "宝宝睡着时，睡眠卡里一行就能开关白噪音", en: "While the baby sleeps, one line on the sleep card turns white noise on or off" }
  ] },
  { v: "2026-11-07.1", title: { zh: "新增音乐卡：白噪音、嘘声、心跳声和儿歌", en: "New music card: white noise, shushing, heartbeat and songs" }, items: [
    { k: "new", zh: "今天页顶部多了一张音乐卡，可放白噪音、嘘声、心跳声", en: "A music card on Today's top slides: white noise, shushing, heartbeat" },
    { k: "new", zh: "也能放家庭学堂里的儿歌，可循环、可定时关闭", en: "Also plays your Homeschool songs, with repeat and a sleep timer" },
    { k: "new", zh: "宝宝睡着时，睡眠卡下面也能直接放", en: "Also playable right under the sleep card while the baby sleeps" }
  ] },
  { v: "2026-11-06.1", title: { zh: "新增「夜间干爽」记录", en: "New record: dry night" }, items: [
    { k: "new", zh: "早上记一下昨晚有没有尿床，和家庭学堂共用", en: "Log each morning whether last night was dry; shared with Homeschool" },
    { k: "better", zh: "趋势页先显示亲喂、喂奶、奶瓶、尿布和便便", en: "Trends now start with nursing, feeds, bottle, wet diapers and poop" }
  ] },
  { v: "2026-11-03.1", title: { zh: "家庭备份更完整", en: "More complete family backups" }, items: [
    { k: "better", zh: "备份更完整：睡前安排和家人健康记录也会备份", en: "Backups now also include bedtime routines and family health records" }
  ] },
  { v: "2026-10-28.1", title: { zh: "加入家庭更安全，长列表打开更快", en: "Safer family joining, faster long lists" }, items: [
    { k: "new", zh: "邀请码 7 天有效，新成员要等家主批准才能加入", en: "Invite codes last 7 days; new members wait for the owner's approval" },
    { k: "new", zh: "子页顶上多了「‹ 返回」，回到刚才那一页", en: "A \"‹ Back\" button on sub-pages returns to where you were" },
    { k: "better", zh: "2 岁以上的孩子直接去家庭学堂记录", en: "Children 2 and older go straight to Homeschool" },
    { k: "better", zh: "长列表分批显示更快；记录再多也不会漏同步、漏备份", en: "Long lists load faster in batches; nothing is missed in sync or backup" }
  ] }
];
