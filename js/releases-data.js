/* ============ 发布日志的数据：每次发布（每次 push）一条，最新的在最上面 ============
   v = APP_VERSION（js/state.js），日期取自版本号；title = 一句话简介；items = 要点，k: new 新功能 / better 改进 / fix 修复。
   写给家长看：短、口语，不用技术词。显示由 js/releases-ui.js 负责（我的 → 发布日志、今天页顶上的新版本提示）。 */
export const RELEASES = [
  { v: "2026-11-09.2", title: { zh: "记录时间不能选到未来", en: "Record times can no longer be in the future" }, items: [
    { k: "better", zh: "记录和补记时，时间选择器里晚于现在的时间变灰、不能选", en: "When adding or editing a record, times later than now are greyed out in the picker" },
    { k: "better", zh: "手动填了未来的时间，保存时会提醒", en: "A future time typed by hand gets a reminder when you save" }
  ] },
  { v: "2026-11-09.1", title: { zh: "填表时没保存的内容不会再被自动刷新冲掉", en: "Unsaved typing is no longer wiped by background refreshes" }, items: [
    { k: "fix", zh: "在设置、家庭、备份、问咩咩等页面填写时，后台同步或家人那边有更新也不会清空你正在填的内容，光标也留在原处", en: "While you fill in settings, family, backup or Ask pages, a background sync or a family member's update no longer clears what you're typing, and the cursor stays put" },
    { k: "fix", zh: "顶部卡片每 30 秒刷新时，正在用的音乐下拉框和 ⚙ 菜单不会被关掉", en: "The 30-second top-card refresh no longer closes the music menu or the ⚙ menu you're using" }
  ] },
  { v: "2026-11-08.5", title: { zh: "发布日志可以按天或按版本分组，补上了早期的更新记录", en: "Release notes group by day or version, with the full early history" }, items: [
    { k: "new", zh: "发布日志新增「分组」：按版本或按天，记住你的选择", en: "Release notes get a Group option: by version or by day, remembered" },
    { k: "better", zh: "补上了从上线第一天起的更新记录", en: "Every update since the first day is now listed" }
  ] },
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
  ] },
  { v: "2026-10-27.2", title: { zh: "深色模式下日期选择更清楚", en: "Clearer date pickers in dark mode" }, items: [
    { k: "fix", zh: "深色模式下，日期和时间选择器的颜色正常了", en: "Date and time pickers now look right in dark mode" }
  ] },
  { v: "2026-10-27.1", title: { zh: "设置里能看到存储用了多少", en: "See how much storage is used" }, items: [
    { k: "new", zh: "设置里新增「存储用量」，快满时会变黄、变红", en: "Settings shows storage use; it turns yellow, then red, as it fills up" }
  ] },
  { v: "2026-10-26.1", title: { zh: "浏览器标签上有了小图标", en: "An icon in the browser tab" }, items: [
    { k: "fix", zh: "浏览器标签页上显示小月亮的图标", en: "The browser tab now shows the Little Moon icon" }
  ] },
  { v: "2026-10-25.38", title: { zh: "备份记录不会再忽然消失", en: "Backup history no longer vanishes" }, items: [
    { k: "fix", zh: "Google 登录过期时，备份记录不再被清空", en: "Backup history is kept when the Google sign-in expires" },
    { k: "new", zh: "过期时会提示，点一下重新授权就好", en: "You're told when it expires; one tap signs you back in" }
  ] },
  { v: "2026-10-25.37", title: { zh: "「小Y问」改名「咩咩咩」", en: "Ask Y is now Baa Baa" }, items: [
    { k: "better", zh: "AI 助理改名「咩咩」，换上可爱的小羊图标", en: "The AI helper is now called Baa, with a cute lamb icon" },
    { k: "better", zh: "今天页有一整行入口，随时问问咩咩", en: "A full-width entry on Today to ask Baa anytime" }
  ] },
  { v: "2026-10-25.36", title: { zh: "能看到上次同步的时间", en: "See when you last synced" }, items: [
    { k: "new", zh: "家庭同步卡上显示上次同步的时间", en: "The family sync card shows when it last synced" }
  ] },
  { v: "2026-10-25.35", title: { zh: "备份记录更简洁", en: "A tidier backup history" }, items: [
    { k: "better", zh: "默认只显示最近 3 条，更早的点开再看", en: "Shows the latest 3; tap to see older ones" },
    { k: "better", zh: "默认从 Google Drive 读取备份", en: "Google Drive is the default place to read backups from" }
  ] },
  { v: "2026-10-25.34", title: { zh: "新增 AI 问询「小Y问」", en: "New: ask the AI helper" }, items: [
    { k: "new", zh: "按宝宝的阶段提问：喂奶、睡眠、辅食、要不要看医生", en: "Ask by stage: feeding, sleep, solids, whether to see a doctor" },
    { k: "new", zh: "没有 key 也能一键复制问题，去常用的 AI 里问", en: "No key? Copy the question in one tap and ask your usual AI" },
    { k: "better", zh: "子页顶上显示你所在的位置", en: "Sub-pages show where you are at the top" }
  ] },
  { v: "2026-10-25.33", title: { zh: "在 Drive 选的文件夹能正常备份", en: "Backups work in a Drive folder you picked" }, items: [
    { k: "fix", zh: "在 Google Drive 里选的文件夹，备份能正常写进去", en: "Backups now save properly to a folder you picked in Google Drive" }
  ] },
  { v: "2026-10-25.32", title: { zh: "可以在 Drive 里选已有的文件夹了", en: "Picking an existing Drive folder now works" }, items: [
    { k: "fix", zh: "「在 Drive 里选一个文件夹」可以用了", en: "Choosing a folder in Google Drive now works" }
  ] },
  { v: "2026-10-25.31", title: { zh: "Drive 备份路径多了提示", en: "A hint for the Drive backup path" }, items: [
    { k: "better", zh: "路径下面提示怎样改用 Drive 里已有的文件夹", en: "A hint under the path explains how to use an existing Drive folder" }
  ] },
  { v: "2026-10-25.30", title: { zh: "云盘连接不用重新连", en: "Cloud drives stay connected" }, items: [
    { k: "fix", zh: "升级后原来连好的云盘照样能用，不用重新连接", en: "Cloud drives you connected keep working after the update" },
    { k: "better", zh: "备份结果里写明是 Google Drive 还是 Dropbox", en: "Backup results say whether it went to Google Drive or Dropbox" }
  ] },
  { v: "2026-10-25.29", title: { zh: "家主可以一键备份全家", en: "Owners can back up the whole family" }, items: [
    { k: "new", zh: "家主备份时，全家的记录连同家庭学堂、牧羊人一起打包", en: "Owner backups include the whole family, plus Homeschool and Shepherd" },
    { k: "better", zh: "恢复只补上缺的，不会覆盖或删除", en: "Restoring only fills in what's missing; it never overwrites or deletes" },
    { k: "better", zh: "云盘连一次，四个应用都能用", en: "Connect a cloud drive once and all four apps can use it" }
  ] },
  { v: "2026-10-25.28", title: { zh: "可以连接 Google Drive 备份了", en: "Google Drive backups can be connected" }, items: [
    { k: "new", zh: "备份可以放到你自己的 Google Drive", en: "Back up to your own Google Drive" }
  ] },
  { v: "2026-10-25.27", title: { zh: "云盘备份可以指定文件夹", en: "Choose a folder for cloud backups" }, items: [
    { k: "new", zh: "Google Drive 和 Dropbox 可以指定备份放在哪个文件夹", en: "Choose which Google Drive or Dropbox folder backups go to" },
    { k: "better", zh: "文件夹不存在会自动建好", en: "Missing folders are created for you" }
  ] },
  { v: "2026-10-25.26", title: { zh: "电脑文件夹备份可选云盘", en: "Folder backups can use your cloud drive" }, items: [
    { k: "better", zh: "选文件夹时可挑 iCloud、OneDrive、Google Drive、Dropbox，并提示它们在哪", en: "Pick iCloud, OneDrive, Google Drive or Dropbox and see where each folder is" }
  ] },
  { v: "2026-10-25.25", title: { zh: "「我的」重新整理", en: "Me page reorganized" }, items: [
    { k: "better", zh: "我的：六个入口，每个都显示当前状态", en: "Me: six entries, each showing its current state" },
    { k: "better", zh: "家庭、孩子、妈妈用药、信仰各有自己的页", en: "Family, children, mom's medicines and faith each get their own page" },
    { k: "better", zh: "同步、备份与恢复页重新设计", en: "The sync and backup page is redesigned" }
  ] },
  { v: "2026-10-25.24", title: { zh: "重新加入家庭后记录不会丢", en: "No lost records after rejoining a family" }, items: [
    { k: "fix", zh: "重新输入邀请码加入后，之前没传上去的记录也会补传", en: "After rejoining with the invite code, records that never uploaded are sent too" }
  ] },
  { v: "2026-10-25.23", title: { zh: "家人记的记录能及时看到", en: "See family members' records reliably" }, items: [
    { k: "fix", zh: "一条记录同步失败时，其他记录照常同步", en: "One failed record no longer blocks the rest of the sync" },
    { k: "fix", zh: "网络差时同步不会卡住", en: "Sync no longer gets stuck on a weak connection" },
    { k: "fix", zh: "手机休眠醒来后会自动重新连上", en: "Reconnects automatically after the phone wakes up" }
  ] },
  { v: "2026-10-25.22", title: { zh: "新增「备份与恢复」", en: "New: backup and restore" }, items: [
    { k: "new", zh: "我的 → 备份与恢复：随时备份，或下载一份", en: "Me → Backup and restore: back up or download a copy anytime" },
    { k: "new", zh: "可以按周、按月自动备份", en: "Automatic weekly or monthly backups" },
    { k: "new", zh: "备份到云端或电脑的文件夹，保留 60 天", en: "Back up to the cloud or a folder on your computer; kept 60 days" },
    { k: "new", zh: "恢复前先预览，确认后再恢复", en: "Preview a backup before restoring it" }
  ] },
  { v: "2026-10-24.21", title: { zh: "左滑删除更稳", en: "Steadier swipe-to-delete" }, items: [
    { k: "fix", zh: "左滑删除不再打乱记录行的排版", en: "Swipe-to-delete no longer messes up the row layout" }
  ] },
  { v: "2026-10-24.20", title: { zh: "只有记录行能左滑删除", en: "Only record rows swipe to delete" }, items: [
    { k: "fix", zh: "其他区域不会再被误滑删除", en: "Other parts of the page can no longer be swiped away by mistake" }
  ] },
  { v: "2026-10-24.19", title: { zh: "左滑后点「删除」能用了", en: "Tapping Delete after a swipe works" }, items: [
    { k: "fix", zh: "左滑后点红色「删除」能正常删除", en: "Tapping the red Delete after a swipe now deletes" }
  ] },
  { v: "2026-10-24.18", title: { zh: "左滑删除后记录行样式正常", en: "Rows look right with swipe-to-delete" }, items: [
    { k: "fix", zh: "加了左滑删除后，记录行的样式恢复正常", en: "Record rows look normal again with swipe-to-delete" }
  ] },
  { v: "2026-10-24.17", title: { zh: "新增左滑删除记录", en: "New: swipe to delete" }, items: [
    { k: "new", zh: "记录向左滑，点红色「删除」就能删", en: "Swipe a record left and tap the red Delete" },
    { k: "better", zh: "删除前都会先确认", en: "It always asks before deleting" }
  ] },
  { v: "2026-10-24.16", title: { zh: "往下滚时顶上留一条窄条", en: "A slim bar on top while scrolling" }, items: [
    { k: "new", zh: "页头滚出屏幕后，顶上留一条窄条，点它回到顶部", en: "A slim bar stays on top once the header scrolls away; tap it to go back up" },
    { k: "better", zh: "子页的窄条上有「‹ 返回」", en: "On sub-pages the bar has a ‹ Back link" }
  ] },
  { v: "2026-10-24.15", title: { zh: "尿布图标换成真正的尿布", en: "A real diaper icon" }, items: [
    { k: "fix", zh: "尿布图标原来像回形针，现在换成画出来的尿布", en: "The diaper icon looked like a paper clip; now it's a drawn diaper" }
  ] },
  { v: "2026-10-24.14", title: { zh: "版本号摆放更整齐", en: "Tidier version number" }, items: [
    { k: "fix", zh: "版本号在手机和电脑上都摆放整齐", en: "The version number sits neatly on phones and computers" }
  ] },
  { v: "2026-10-24.13", title: { zh: "今天页也能用时间轴", en: "Timeline view on Today too" }, items: [
    { k: "new", zh: "今天页也能切换「列表 / 时间轴」", en: "Today can switch between list and timeline too" },
    { k: "fix", zh: "页头标题不再折成两行", en: "The header title no longer wraps to two lines" }
  ] },
  { v: "2026-10-24.12", title: { zh: "页头显示版本号", en: "Version number in the header" }, items: [
    { k: "new", zh: "同步状态旁显示版本号，一眼看出是不是最新", en: "The version shows next to the sync status, so you can tell if you're up to date" }
  ] },
  { v: "2026-10-24.11", title: { zh: "时间线可以竖着看", en: "A vertical timeline view" }, items: [
    { k: "new", zh: "记录页可切换「列表 / 时间轴」，会记住你的选择", en: "Switch between list and timeline on Records; your choice is remembered" },
    { k: "new", zh: "时间轴上标出相邻两条隔了多久", en: "The timeline shows the gap between entries" },
    { k: "better", zh: "类型筛选和「＋ 补记一条」放在同一行", en: "The type filter and + Add past entry share one row" }
  ] },
  { v: "2026-10-24.10", title: { zh: "排序箭头位置更顺眼", en: "Neater sort arrows" }, items: [
    { k: "fix", zh: "表头的排序箭头移到文字右边", en: "Sort arrows now sit to the right of the column names" }
  ] },
  { v: "2026-10-24.9", title: { zh: "记录页更好查", en: "Records are easier to browse" }, items: [
    { k: "new", zh: "按餐表格点表头就能排序", en: "Tap a column header to sort the meal table" },
    { k: "better", zh: "时间线按类型筛选改成下拉框", en: "A dropdown filters the timeline by type" },
    { k: "better", zh: "趋势可选按天或按周，看多长时间", en: "Trends: choose by day or week, and how far back" }
  ] },
  { v: "2026-10-24.8", title: { zh: "间隔太久时顶部卡片会提醒", en: "Top cards warn when it's been too long" }, items: [
    { k: "new", zh: "喂奶、换尿布、如厕、吃饭比平时隔得久，卡片会变色提醒", en: "If a feed, diaper, potty or meal is overdue compared with usual, the card warns" },
    { k: "better", zh: "夜里和睡着时不提醒", en: "No warnings at night or while asleep" },
    { k: "better", zh: "每张卡都能单独关掉提醒", en: "Warnings can be turned off per card" }
  ] },
  { v: "2026-10-24.7", title: { zh: "顶部卡片能一直滑下去", en: "Top cards scroll endlessly" }, items: [
    { k: "better", zh: "顶部卡片左右一直滑，不会到头", en: "Top cards keep scrolling either way without hitting an end" },
    { k: "better", zh: "设置里向左滑就能移除一张卡", en: "Swipe a card left in settings to remove it" }
  ] },
  { v: "2026-10-24.6", title: { zh: "习惯放到今天页", en: "Habits on Today" }, items: [
    { k: "new", zh: "今天页「最近 24 小时」下面能看习惯，也能补记", en: "Habits show under Last 24 hours on Today, and you can add past ones" },
    { k: "new", zh: "24 小时统计新增「习惯完成」", en: "Last 24 hours now counts habits done" },
    { k: "better", zh: "顶部卡片首尾相接，循环滑动", en: "Top cards loop around" }
  ] },
  { v: "2026-10-24.5", title: { zh: "习惯分组有了颜色，卡片拖动排序", en: "Colored habit groups, drag to reorder cards" }, items: [
    { k: "better", zh: "晨间、午间、晚间、睡前各有自己的颜色", en: "Morning, midday, evening and bedtime each have their own color" },
    { k: "better", zh: "顶部卡片设置里按住拖动就能调顺序", en: "Press and drag to reorder top cards in settings" }
  ] },
  { v: "2026-10-24.4", title: { zh: "习惯清单编辑框更清楚", en: "A clearer habit list editor" }, items: [
    { k: "fix", zh: "编辑框有了清楚的边框和滚动条，不再看不清", en: "The editor now has a clear border and scroll bar" }
  ] },
  { v: "2026-10-24.3", title: { zh: "电脑上翻卡片更方便", en: "Easier card flipping on computers" }, items: [
    { k: "better", zh: "电脑上卡片两侧有上一张、下一张箭头", en: "Previous and next arrows beside the top cards on computers" },
    { k: "better", zh: "下方圆点改成短线，更好点", en: "The dots become dashes that are easier to click" }
  ] },
  { v: "2026-10-24.2", title: { zh: "习惯清单「加入模板」能用了", en: "Habit templates work" }, items: [
    { k: "fix", zh: "习惯清单的「加入模板」按钮能用了", en: "The Add template button in the habit list now works" },
    { k: "better", zh: "同名的步骤会自动编号", en: "Steps with the same name are numbered automatically" }
  ] },
  { v: "2026-10-24.1", title: { zh: "顶部计时变成可滑动的卡片", en: "Top timers become swipeable cards" }, items: [
    { k: "new", zh: "顶部可左右滑动好几张计时卡", en: "Swipe through several timer cards at the top" },
    { k: "new", zh: "卡片右上角 ⚙ 直接改内容、顺序、增删", en: "⚙ on a card changes what it shows, its order, or adds and removes cards" },
    { k: "better", zh: "记录按钮更小，紧跟在状态后面", en: "Smaller record buttons right below the status" }
  ] },
  { v: "2026-10-23.4", title: { zh: "顶部计时可以同时看好几项", en: "The top timer shows several things" }, items: [
    { k: "new", zh: "顶部大计时可同时显示喂奶、尿布、如厕、吃饭等", en: "The big timer can show feeds, diapers, potty, meals and more at once" }
  ] },
  { v: "2026-10-23.3", title: { zh: "习惯清单可以分组", en: "Habit lists in groups" }, items: [
    { k: "new", zh: "习惯按晨间、午间、晚间、睡前分组", en: "Group habits by morning, midday, evening and bedtime" },
    { k: "better", zh: "可以自由增删改，也能一键加入模板", en: "Edit freely, or add a template in one tap" }
  ] },
  { v: "2026-10-23.2", title: { zh: "新增每日习惯清单", en: "New: daily habit checklist" }, items: [
    { k: "new", zh: "每日习惯：起床、上厕所、刷牙，一键打勾", en: "Daily habits like waking up, potty and brushing teeth, one tap each" },
    { k: "new", zh: "顶部大计时可显示距上次如厕多久", en: "The big timer can show time since the last potty" },
    { k: "new", zh: "吃饭记录可记洗手、用时和专心程度", en: "Meal records can note handwashing, time taken and focus" }
  ] },
  { v: "2026-10-23.1", title: { zh: "语言切换改成地球按钮", en: "A globe button for language" }, items: [
    { k: "better", zh: "点页头的地球按钮切换语言", en: "Tap the globe in the header to switch language" },
    { k: "better", zh: "子页顶上的路径条一直留在顶部", en: "The path bar on sub-pages stays pinned at the top" }
  ] },
  { v: "2026-10-22.1", title: { zh: "新的应用切换器", en: "A new app switcher" }, items: [
    { k: "new", zh: "右上角九宫格一键切换家里的其他应用", en: "A grid button at the top right switches to the family's other apps" }
  ] },
  { v: "2026-10-21.1", title: { zh: "姐妹应用新增「牧羊人」", en: "New sister app: Shepherd" }, items: [
    { k: "new", zh: "第四个姐妹应用「牧羊人」：记大人自己的读经、祷告、锻炼", en: "A fourth sister app, Shepherd, for grown-ups' Bible reading, prayer and exercise" }
  ] },
  { v: "2026-10-19.4", title: { zh: "每个孩子一张小卡片", en: "A small card for each child" }, items: [
    { k: "better", zh: "设置里每个孩子一张小卡片，手机上也整齐", en: "Each child gets a small card in settings, tidy on phones too" }
  ] },
  { v: "2026-10-19.3", title: { zh: "手机上日期框不再超出", en: "Date fields fit on phones" }, items: [
    { k: "fix", zh: "手机上日期框不再超出屏幕", en: "Date fields no longer spill off the phone screen" }
  ] },
  { v: "2026-10-19.2", title: { zh: "孩子可以归档", en: "Children can be archived" }, items: [
    { k: "new", zh: "「移除」改成归档，记录都保留，随时能恢复", en: "Remove becomes Archive: records are kept and you can restore anytime" },
    { k: "fix", zh: "手机上孩子那几行不再叠在一起", en: "Child rows no longer overlap on phones" }
  ] },
  { v: "2026-10-19.1", title: { zh: "设置页更好看", en: "A nicer settings page" }, items: [
    { k: "better", zh: "输入框改成圆角，卡片更柔和", en: "Rounded inputs and softer cards" },
    { k: "fix", zh: "深色模式下日期图标看得清", en: "Date icons are visible in dark mode" }
  ] },
  { v: "2026-10-18.3", title: { zh: "新增信仰模块（可选）", en: "New: optional faith module" }, items: [
    { k: "new", zh: "设置里打开「信仰」，可记祷告、家庭敬拜、读经、服事", en: "Turn on Faith to log prayer, family worship, scripture and serving" },
    { k: "better", zh: "默认关闭，关着时完全不显示", en: "Off by default and fully hidden while off" },
    { k: "better", zh: "可以按孩子分别打开", en: "Can be turned on per child" }
  ] },
  { v: "2026-10-18.2", title: { zh: "记录可以选谁能看到", en: "Choose who sees each record" }, items: [
    { k: "new", zh: "每条记录可选：仅我、指定家人、全家", en: "Each record can be for me only, chosen family members, or everyone" },
    { k: "better", zh: "情绪、自律、社交默认仅我可见", en: "Mood, self-discipline and social records default to me only" },
    { k: "better", zh: "别人分享给你的记录只能看不能改", en: "Records shared with you are read-only" }
  ] },
  { v: "2026-10-18.1", title: { zh: "支持学龄和青少年阶段", en: "School-age and teen stages" }, items: [
    { k: "new", zh: "新增学龄、青少年阶段：陪伴、情绪、自律、社交", en: "New school-age and teen stages: time together, mood, self-discipline, social" },
    { k: "new", zh: "我的 → 卡片：快捷按钮和统计可以自由开关", en: "Me → Cards: turn quick buttons and stats on or off" }
  ] },
  { v: "2026-10-17.11", title: { zh: "体检日期可以改成实际预约日", en: "Set the real checkup date" }, items: [
    { k: "new", zh: "体检表里的日期可改成医生的实际预约日", en: "Change a checkup's date to the actual appointment" },
    { k: "better", zh: "今天页提醒和打印页都跟着变", en: "Today's reminder and printouts follow it" }
  ] },
  { v: "2026-10-17.10", title: { zh: "按日期查记录", en: "Jump to any day" }, items: [
    { k: "new", zh: "按餐表格和时间线可以选日期直接跳过去", en: "Pick a date to jump to it in the meal table and timeline" },
    { k: "better", zh: "时间线一天一天看，搜索仍查全部", en: "The timeline shows one day at a time; search still covers everything" }
  ] },
  { v: "2026-10-17.9", title: { zh: "成长和妈妈页更好找", en: "Grow and Mom are easier to find your way in" }, items: [
    { k: "better", zh: "成长、妈妈页改成目录，点进去看各个主题", en: "Grow and Mom become menus that open each topic" },
    { k: "better", zh: "今天页的提醒放到快捷按钮上方", en: "Today's warnings move above the quick buttons" },
    { k: "better", zh: "记完后自动滚到新的那条并高亮", en: "After saving, Today scrolls to the new entry and highlights it" }
  ] },
  { v: "2026-10-17.8", title: { zh: "页头和图标更好认", en: "Clearer header and icons" }, items: [
    { k: "better", zh: "姐妹应用按钮移到右上角", en: "Sister-app buttons move to the top right" },
    { k: "better", zh: "「记录」换了图标，和「我的」好区分", en: "Records gets a new icon so it's easy to tell from Me" }
  ] },
  { v: "2026-10-17.7", title: { zh: "「我的」页重新排版", en: "A new layout for Me" }, items: [
    { k: "better", zh: "设置、问答、介绍排成一列，下面是打印和姐妹应用", en: "Settings, Q&A and About in one list, then printing and sister apps" }
  ] },
  { v: "2026-10-17.6", title: { zh: "底部新增「我的」", en: "New Me tab" }, items: [
    { k: "new", zh: "设置、问答、打印、介绍都放进「我的」", en: "Settings, Q&A, printing and About all live under Me" }
  ] },
  { v: "2026-10-17.5", title: { zh: "新增介绍页", en: "New About page" }, items: [
    { k: "new", zh: "介绍页：小月亮是什么、每页怎么用、小技巧和隐私", en: "About: what Little Moon is, how each page works, tips and privacy" }
  ] },
  { v: "2026-10-17.4", title: { zh: "可以打印了", en: "Printing is here" }, items: [
    { k: "new", zh: "可打印按餐表格、趋势、时间线和就医记录", en: "Print the meal table, trends, timeline and medical history" },
    { k: "better", zh: "页头和家庭学堂一样，手机上收进「更多」菜单", en: "The header matches Homeschool; on phones extras sit in a More menu" },
    { k: "better", zh: "姐妹应用「家庭妈妈小助手」改名「爱家小助手」", en: "The sister app is renamed Loving Home Helper" }
  ] },
  { v: "2026-10-17.3", title: { zh: "关掉设置后回到今天页顶部", en: "Closing settings goes back to Today's top" }, items: [
    { k: "fix", zh: "关掉设置后回到今天页最上面", en: "Closing settings returns to the top of Today" }
  ] },
  { v: "2026-10-17.2", title: { zh: "一键切换姐妹应用", en: "Switch to sister apps in one tap" }, items: [
    { k: "new", zh: "标题旁的按钮可打开家里的其他应用", en: "A button next to the title opens the family's other apps" },
    { k: "fix", zh: "菜单变宽，应用名不再折行", en: "A wider menu keeps app names on one line" }
  ] },
  { v: "2026-10-17.1", title: { zh: "健康记录分清在家、体检、看病", en: "Health records by home, checkup or sick visit" }, items: [
    { k: "new", zh: "宝宝健康记录可标明：在家、体检、看病", en: "Baby health records note home, checkup or sick visit" },
    { k: "new", zh: "成长页可在体检提醒和就诊历史之间切换", en: "Grow switches between checkup reminders and visit history" },
    { k: "better", zh: "记下体检后，体检表自动打勾", en: "Logging a checkup ticks it off the schedule" }
  ] },
  { v: "2026-10-16.2", title: { zh: "家人的称呼可以改", en: "Rename family members" }, items: [
    { k: "new", zh: "家主能改任何家人的称呼，家人也能改自己的", en: "Owners can rename anyone; members can rename themselves" }
  ] },
  { v: "2026-10-16.1", title: { zh: "支持英文和繁体，家人凭邀请码加入", en: "English and Traditional Chinese; join by invite code" }, items: [
    { k: "new", zh: "界面支持简体、繁體和英文", en: "The app speaks Simplified Chinese, Traditional Chinese and English" },
    { k: "new", zh: "家人输入邀请码就能加入，不用注册", en: "Family members join with an invite code, no sign-up needed" },
    { k: "new", zh: "家主可以管理家人", en: "The family owner can manage members" }
  ] },
  { v: "2026-10-15.5", title: { zh: "喂奶选项跟着月龄变", en: "Feeding options follow the child's age" }, items: [
    { k: "better", zh: "喂奶方式按月龄给出合适的选项", en: "Feeding choices fit the child's age" },
    { k: "new", zh: "一项活动可以同时记给几个孩子", en: "Log one activity for several children at once" },
    { k: "better", zh: "表单里换孩子更清楚", en: "Switching children in forms is clearer" }
  ] },
  { v: "2026-10-15.4", title: { zh: "按年龄阶段显示合适的内容", en: "Pages that fit each age stage" }, items: [
    { k: "new", zh: "婴儿、幼儿、学前各有适合的页面和记录", en: "Pages and records fit infant, toddler and preschool stages" },
    { k: "new", zh: "新增辅食、里程碑、如厕、说话、活动、行为记录", en: "New records: solids, milestones, potty, speech, activities, behavior" },
    { k: "new", zh: "成长页有里程碑、新食物和身高曲线", en: "Grow shows milestones, new foods and a height chart" }
  ] },
  { v: "2026-10-15.3", title: { zh: "在页头切换孩子", en: "Switch children from the header" }, items: [
    { k: "better", zh: "点页头的名字就能切换孩子，还能看到月龄", en: "Tap the name in the header to switch children and see their ages" }
  ] },
  { v: "2026-10-15.2", title: { zh: "幕后整理，为新功能打基础", en: "Behind-the-scenes groundwork" }, items: [
    { k: "better", zh: "整理了程序，为后面的新功能打好基础，用起来不变", en: "Groundwork for upcoming features; nothing changes for you" }
  ] },
  { v: "2026-10-15", title: { zh: "支持多个孩子", en: "Support for several children" }, items: [
    { k: "new", zh: "可以添加多个孩子，每条记录记在对应孩子名下", en: "Add several children; each record belongs to one of them" },
    { k: "new", zh: "页头可以切换孩子", en: "Switch children from the header" },
    { k: "better", zh: "原来的记录自动归到第一个孩子", en: "Existing records go to the first child automatically" }
  ] },
  { v: "2026-10-14", title: { zh: "iPhone 上弹窗位置正确", en: "Pop-ups sit right on iPhone" }, items: [
    { k: "fix", zh: "不同 iOS 版本上，弹窗位置都正确", en: "Pop-ups appear in the right place across iOS versions" }
  ] },
  { v: "2026-10-13", title: { zh: "身高体重单位换算更准", en: "Better height and weight units" }, items: [
    { k: "better", zh: "身高、体重的单位换算更准确", en: "More accurate unit conversion for height and weight" },
    { k: "fix", zh: "一些样式小修", en: "Small layout fixes" }
  ] },
  { v: "2026-10-12", title: { zh: "支持云同步，全家一起记", en: "Cloud sync: the whole family can log" }, items: [
    { k: "new", zh: "记录可以同步到云端", en: "Records sync to the cloud" },
    { k: "new", zh: "家人可以一起记录同一个宝宝", en: "Family members can log for the same baby together" }
  ] },
  { v: "2026-10-11", title: { zh: "小月亮上线", en: "Little Moon launches" }, items: [
    { k: "new", zh: "一键记喂奶（亲喂、瓶喂、配方奶）、换尿布、睡觉", en: "One-tap logging for feeds (breast, bottle, formula), diapers and sleep" },
    { k: "new", zh: "成长页记体重、身长、头围和宝宝健康", en: "Grow: weight, length, head size and baby health" },
    { k: "new", zh: "妈妈页记身体状况和用药", en: "Mom: her own health and medicines" },
    { k: "new", zh: "记录页看全部记录，可导出备份和表格", en: "Records shows everything, with backup and spreadsheet export" }
  ] }
];
