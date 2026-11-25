/* ============ 发布日志的数据：每次发布（每次 push）一条，最新的在最上面 ============
   v = APP_VERSION（js/state.js），日期取自版本号；title = 一句话简介；items = 要点，k: new 新功能 / better 改进 / fix 修复。
   写给家长看：短、口语，不用技术词。显示由 js/releases-ui.js 负责（我的 → 发布日志、今天页顶上的新版本提示）。 */
export const RELEASES = [
  { v: "2026-11-24.5", title: { zh: "共用样式表多了按钮和按钮条", en: "Shared stylesheet gains button and button-row styles" }, items: [
    { k: "better", zh: "和爱家小助手同步共用样式：标准按钮高度（40 / 34px）和按钮条排法（本站暂未使用，界面不变）。", en: "Synced shared styles from Home Pantry: standard button heights (40 / 34 px) and the button-row layout (not used here yet; nothing changes on screen)." },
  ] },
  { v: "2026-11-24.4", title: { zh: "共用样式表多了箭头、行、选项和数字框样式", en: "Shared stylesheet gains arrow, row, option and number-field styles" }, items: [
    { k: "better", zh: "和爱家小助手同步共用样式：箭头、记录行、可选项、弹窗变量、数字框（本站暂未使用，界面不变）。", en: "Synced shared styles from Home Pantry: arrow, row, option, sheet variables, number field (not used here yet; nothing changes on screen)." },
  ] },
  { v: "2026-11-24.3", title: { zh: "用药历史页的按钮加高", en: "Taller buttons on the medicine history page" }, items: [
    { k: "fix", zh: "「用药历史与趋势」里的 14 / 30 天按钮加高到 44px，手机上更好点", en: "The 14 / 30 day buttons on Medicine history & trends are 44 px tall, easier to tap on a phone" },
  ] },
  { v: "2026-11-24.2", title: { zh: "妈妈用药：历史、趋势和补记", en: "Mom's meds: history, trends and back-fill" }, items: [
    { k: "new", zh: "妈妈页新增「用药历史与趋势」：近 14 / 30 天每天吃了几次药（柱状图）、每种药各几次、按天排的每一次，点一条可以改或删，「补记用药」可以选过去的时间", en: "Mom has a new Medicine history & trends page: doses per day for 14 / 30 days, doses per medicine, every dose by day (tap to edit or delete), and Back-fill with a past time" },
    { k: "new", zh: "「妈妈用药间隔」里每种药可以选「不显示在顶部卡片」，已康复或不吃了的药就不再占着顶部计时卡", en: "Each medicine in Mom's medication intervals can be hidden from the top card once you've recovered or stopped" },
  ] },
  { v: "2026-11-24.1", title: { zh: "妈妈用药：记服药时机，顶部有用药计时卡", en: "Mom's meds: how-to-take notes and a top timer card" }, items: [
    { k: "new", zh: "用药记录和「妈妈用药间隔」设置里，每种药都能填服药时机（空腹 / 饭前 / 饭后 / 随餐 / 睡前，饭前饭后可填分钟）和医嘱备注", en: "Each medicine can now note when to take it (empty stomach / before / after meals / with meals / bedtime, with minutes) and a doctor's note" },
    { k: "new", zh: "今天页顶部新增「距上次妈妈用药」大卡片：显示多久没吃药、下次可服时间和服药时机；近 30 天记过妈妈用药就自动出现，也可在「我的 → 顶部大计时」里添加", en: "A new Since Mom's last medicine card on top of Today shows the time since the last dose, when the next is allowed, and how to take it; it appears automatically once Mom has logged a medicine in the last 30 days, or add it under Me → Top timers" },
    { k: "better", zh: "妈妈用药列表同样显示服药时机和医嘱", en: "The Mom's meds list shows the how-to-take note too" },
  ] },
  { v: "2026-11-23.3", title: { zh: "换尿布可以记尿布疹，并提示要不要抹药", en: "Diaper changes can note diaper rash, with a cream reminder" }, items: [
    { k: "new", zh: "换尿布表单新增「尿布疹」（默认无，可选轻微 / 中等 / 严重），有疹子时还能勾「涂了药膏」", en: "The diaper form has a new Diaper rash field (none by default; mild, moderate or severe) and a Cream applied tick" },
    { k: "new", zh: "顶部换尿布卡片会根据上次记录的尿布疹程度，提示这次要不要抹药膏；严重时提醒必要时联系儿科医生；上次涂过药膏的，提示这次继续涂", en: "The diaper card now suggests whether to apply cream based on the last rash level, says when to call the pediatrician for severe rash, and reminds you to keep applying if cream was used last time" },
    { k: "better", zh: "换尿布勾选「便」后，大便颜色默认选「黄」，下拉里去掉了「—」空选项", en: "Ticking Poop in the diaper form now defaults the color to Yellow, and the — empty choice is gone from that dropdown" }
  ] },
  { v: "2026-11-23.1", title: { zh: "顶部计时卡：整张卡片点一下就能记录", en: "Top timer cards: tap the card to log" }, items: [
    { k: "better", zh: "喂奶、换尿布等计时卡不用再找小按钮：点卡片任何地方就打开记录表单，右上角的「＋」是提示", en: "Feed, diaper and other timer cards no longer have a small button: tap anywhere on the card to open the record form (the + in the corner is the hint)" },
    { k: "better", zh: "去掉了卡片右上角的齿轮；顶部卡片的设置仍在「我的 → 顶部大计时」", en: "Removed the gear from the card corner; card settings are still under Me → Top timer" }
  ] },
  { v: "2026-11-22.1", title: { zh: "AI 录入疫苗：更不容易记重", en: "AI intake: fewer duplicate vaccine records" }, items: [
    { k: "fix", zh: "就诊小结里把以前打过的疫苗又列了一遍时，已经记过的（同一种、同一剂次，日期差几天也算）默认不勾，不会再记一份", en: "When a visit summary re-lists shots already given, vaccines you have already recorded (same vaccine and dose, even if the date is a few days off) are left unticked" },
    { k: "better", zh: "让 AI 只读这次就诊当天打的针，跳过重新印出来的接种历史；同一张单子里重复读到的针也只留一条", en: "The AI now reads only shots given at this visit and skips the re-printed history; repeats within one page are kept once" }
  ] },
  { v: "2026-11-20.5", title: { zh: "成长首页：导航卡片放最上面", en: "Growth home: navigation cards on top" }, items: [
    { k: "better", zh: "成长首页顶上换成一排导航卡片，原来的目录列表（含“AI 一次录入体检 / 就诊”）去掉；成长阶段挪到下面，可以折叠，默认展开", en: "The Growth home now opens with navigation cards instead of the topic list (including the AI checkup entry row); the stage section moved below and can be collapsed, open by default" }
  ] },
  { v: "2026-11-20.4", title: { zh: "页内切换统一成导航小卡片", en: "In-page switches are now navigation cards" }, items: [
    { k: "better", zh: "记录页的三个视图（按餐表格 / 趋势对比 / 时间线）、儿科体检与就诊的“提醒 / 历史记录”，改成和爱家小助手一样的带图标导航小卡片，当前这一项深色高亮", en: "The Log page views (meal table / trends / timeline) and the checkup Reminders / History switch are now icon navigation cards, like in Home Pantry, with the current one highlighted" },
    { k: "new", zh: "成长的各个主题页（里程碑、新食物、睡眠、体征、体检与就诊、疫苗）顶上多了一排导航卡片，不用退回成长首页就能互相跳转", en: "Every Growth topic page now has a row of navigation cards on top, so you can jump between milestones, foods, sleep, vitals, checkups and vaccines without going back" }
  ] },
  { v: "2026-11-20.3", title: { zh: "记录表单里的选项改成统一的下拉", en: "Choices in the record forms are now dropdowns" }, items: [
    { k: "better", zh: "记录表单里原来一排排的选项按钮（喂奶方式、大便颜色、来源、谁能看到、记录给哪个孩子等）统一改成下拉，和其他输入框一样高、一样整齐；不想填的项可以选“—”清空", en: "The rows of option buttons in the record forms (feeding method, stool color, source, who can see it, which child, and so on) are now dropdowns, the same height as the other fields; pick — to leave one empty" }
  ] },
  { v: "2026-11-20.2", title: { zh: "新增、补录都收进右下角的圆形「＋」", en: "Add and back-fill actions now live in the round + button" }, items: [
    { k: "better", zh: "记录页和成长各页（睡眠、体征、体检与就诊、里程碑、新食物、疫苗）的“＋ 补记 / 睡眠 / 里程碑 / 接种 / AI 录入”按钮，统一收进右下角的圆形「＋」，点开选要记什么；页面上不再散着一排按钮", en: "The add / back-fill / AI log buttons on the Log page and every Growth page are now in one round + button at the bottom right; tap it to choose what to record" }
  ] },
  { v: "2026-11-20.1", title: { zh: "记录页和成长各页：统一的搜索框和筛选条", en: "Log and Growth pages: one shared search box and filter bar" }, items: [
    { k: "better", zh: "记录页的时间线、成长各页的记录（睡眠、体征、体检与就诊、里程碑、新食物、疫苗）都用同一条「搜索 + 筛选」栏：电脑上一行排开，手机上收成「搜索 + 筛选 (n)」，点开选条件", en: "The Log timeline and the records on every Growth page (sleep, vitals, checkups and visits, milestones, new foods, vaccines) now share one search + filter bar: one row on a laptop, a Search + Filters (n) row on a phone" },
    { k: "new", zh: "成长各页的记录现在也能搜索（备注、名称、日期）；改过筛选后出现「清除筛选」，一下恢复默认", en: "Growth page records can now be searched (notes, names, dates); a Clear filters button appears once a filter is changed" }
  ] },
  { v: "2026-11-19.4", title: { zh: "状态小标签统一成共用的徽标样式", en: "Status labels now use the shared badge style" }, items: [
    { k: "better", zh: "“家主”“已过医嘱间隔”“X 后可再服”这几个小标签换成和其他应用一致的徽标样式（字略粗、颜色统一）", en: "The Owner, Past the dosing interval and Next dose in X labels now use the same badge style as the other apps (slightly bolder, consistent colors)" }
  ] },
  { v: "2026-11-19.3", title: { zh: "修复：深色主题下「已选 n 个」这类浅底数字角标的字看不清", en: "Fix: soft count badges unreadable in the dark theme" }, items: [
    { k: "fix", zh: "手动选深色主题时，「已选 n 个」这类浅底数字角标变成深字配深底、几乎看不见，现在恢复清楚", en: "With the dark theme picked manually, soft count badges (like '3 selected') showed dark text on a dark fill; they are readable again" }
  ] },
  { v: "2026-11-19.2", title: { zh: "表单里的输入框、下拉、日期一样高；加入共用的徽标、铃铛、提示样式", en: "Form fields share one height; shared badge, bell and hint styles added" }, items: [
    { k: "better", zh: "表单里的输入框、下拉、日期原来高度差一两个像素，现在一样高", en: "Inputs, dropdowns and dates in forms were a pixel or two apart in height; they now match" },
    { k: "better", zh: "加入一套和其他应用共用的徽标、提醒铃铛（带数字 / 红点角标）、问号提示的样式，颜色用本站自己的色板；现在的页面还没用上，外观不变", en: "Added the badge, notification bell (with count / dot) and hint styles shared with the other apps, in this app's own colors; existing pages don't use them yet, so nothing looks different" }
  ] },
  { v: "2026-11-19.1", title: { zh: "修复：发新版后旧页面切换语言偶尔失败", en: "Fix: switching language on an already-open page could fail after an update" }, items: [
    { k: "fix", zh: "应用更新后，之前就开着的页面切换英文 / 繁體偶尔下载失败；现在会自动刷新一次换成新版，不用手动刷新", en: "After an update, a page that was already open could fail to switch to English / Traditional Chinese; it now refreshes itself once to get the new version" }
  ] },
  { v: "2026-11-18.3", title: { zh: "打开更快：英文和繁體词典按需下载", en: "Faster to open: English and Traditional Chinese word lists download only when used" }, items: [
    { k: "better", zh: "简体中文用户打开时不再下载英文和繁體词典，发布日志数据也只在需要时才下载；界面和功能都没有变", en: "Simplified Chinese users no longer download the English and Traditional Chinese word lists on open, and the release notes data loads only when needed; the interface and features are unchanged" }
  ] },
  { v: "2026-11-18.2", title: { zh: "应用切换器和语言切换器随应用一起发布", en: "App and language switchers now ship with the app" }, items: [
    { k: "better", zh: "顶栏的应用切换和语言切换不再从别的网站现取，打开更稳；用法和样子都没有变", en: "The app and language switchers no longer load from another site, so they are more reliable; how they look and work is unchanged" }
  ] },
  { v: "2026-11-18.1", title: { zh: "打开更快：程序文件打包发布", en: "Faster to open: app files are now bundled" }, items: [
    { k: "better", zh: "程序文件合并后发布，打开时要下载的文件少了很多，网速慢时更明显；页面和功能都没有变", en: "App files are now bundled, so far fewer files download on open, most noticeable on slow connections; pages and features are unchanged" }
  ] },
  { v: "2026-11-16.2", title: { zh: "修复：刷新总回到同一页", en: "Fix: refresh always returning to the same page" }, items: [
    { k: "fix", zh: "打开过表单后刷新，之后换页再刷新总是回到同一页：现在刷新后停在当前这一页", en: "After refreshing with a form open, later refreshes kept returning to the same page; now a refresh stays on the current page" }
  ] },
  { v: "2026-11-16.1", title: { zh: "刷新后还停在原来那一页", en: "Refresh keeps you on the same page" }, items: [
    { k: "better", zh: "比如在 成长 → 基本体征 或 记录 → 趋势对比 刷新，还是回到那里，不再跳回今天", en: "Refreshing on, say, Growth → Vital signs or Log → Trends brings you back there instead of Today" }
  ] },
  { v: "2026-11-15.3", title: { zh: "体检与就诊：每条都能让 AI 解读", en: "Checkups and visits: AI explanation for each" }, items: [
    { k: "new", zh: "成长 → 儿科体检与就诊，每条下面有「✦ AI 解读」：这次结果说明、医生建议是什么意思怎么做、后续注意、下次可以问医生的问题", en: "Growth → Checkups and visits: each record has \"✦ AI explanation\": what the results show, what the doctor's advice means, what to watch next, questions for next time" },
    { k: "better", zh: "解读先给你看，选「保留」才存下来；保留的收在这条记录下面，可以重新分析或清除。和家庭学堂通用", en: "You see it first and choose Keep to save it; kept ones sit under the record and can be redone or cleared. Shared with Homeschool" }
  ] },
  { v: "2026-11-15.2", title: { zh: "AI 录入能一次读整张生长表", en: "AI entry reads whole growth tables" }, items: [
    { k: "new", zh: "拍生长表或历次体征表：每个日期一行读出来（体重、身长、头围，还有 BMI、血压等），核对后一次存成多条；那天已经记过的默认不勾，勾上就补进那一条", en: "Photograph a growth or vitals table: each date becomes a row (weight, length, head, plus BMI, blood pressure, etc.); review and save them all at once; dates already recorded start unticked and update that record if ticked" }
  ] },
  { v: "2026-11-15.1", title: { zh: "医院和医生分开填；「基本体征」名字统一", en: "Hospital and doctor are separate; \"Vital signs\" everywhere" }, items: [
    { k: "better", zh: "宝宝健康（体检 / 看病）、疫苗接种和 AI 录入里，「医院 / 诊所」和「医生」分成两栏，AI 也分开读出来；旧记录照常显示", en: "Health visits, vaccines and AI entry now have separate \"Hospital / clinic\" and \"Doctor\" fields, read separately by AI; older records still show" },
    { k: "better", zh: "基本体征页的按钮改成「＋ 量一次体征」；打印的就诊资料里「生长测量」改成「基本体征」，多了 BMI、血压、心率和百分位一栏", en: "The vital signs page button is now \"+ Add measurements\"; the printout's growth section is now \"Vital signs\" with a BMI / blood pressure / pulse / percentile column" }
  ] },
  { v: "2026-11-14.6", title: { zh: "修复：今天页打不开", en: "Fix: Today page failed to load" }, items: [
    { k: "fix", zh: "上一版的一个小错误让页面打不开，已修好", en: "A small mistake in the last version stopped the page from loading; fixed" }
  ] },
  { v: "2026-11-14.5", title: { zh: "睡眠卡提示要不要叫醒；音乐卡更简洁", en: "Sleep card says when to wake; simpler music card" }, items: [
    { k: "new", zh: "宝宝睡着时，睡眠卡按年龄提示：小睡建议几点前叫醒、睡太久或太晚了可以叫醒；新生儿按上次吃奶提醒叫醒喂奶；夜里不用叫醒", en: "While the baby sleeps, the sleep card suggests by age when to wake from a nap, flags naps that run long or late, reminds you to wake a newborn to feed, and says night sleep needs no waking" },
    { k: "fix", zh: "顶部卡片里的下拉框（定时关、选声音）点开就关的问题修好了", en: "Dropdowns on the top cards (sleep timer, sound) no longer close right after opening" },
    { k: "better", zh: "宝宝声音换回一排小图标，点一下就换；学堂的歌只显示歌名，用上一首 / 下一首换歌", en: "Baby sounds are a row of small icons again; Homeschool songs just show the title, use previous / next to change" }
  ] },
  { v: "2026-11-14.4", title: { zh: "孩子可以设男孩 / 女孩", en: "Set each child as a boy or girl" }, items: [
    { k: "new", zh: "我的 → 孩子：每个孩子多了「性别」，可不填", en: "Me → Children: each child has an optional sex setting" },
    { k: "better", zh: "基本体征的血压参考线按男孩 / 女孩分开；没填时按较低的那条提醒", en: "Blood pressure reference lines follow the child's sex; without it, the lower line is used" }
  ] },
  { v: "2026-11-14.3", title: { zh: "基本体征：对照同龄正常范围，随时问 AI", en: "Vital signs: normal ranges by age, ask AI anytime" }, items: [
    { k: "better", zh: "「体重 / 身高」改成「基本体征」，和家庭学堂一样：每项一张可收起的卡、按日期的走势线（带年份、百分位）、数据表", en: "\"Weight / height\" is now \"Vital signs\", same as Homeschool: foldable cards, dated trend lines with years and percentiles, data tables" },
    { k: "new", zh: "心率、血压图上标出这个年龄的正常范围，超出的点画成红圈；BMI 显示健康体重 / 超重等", en: "Pulse and blood pressure charts show the normal range for the child's age; points outside it are circled in red; BMI shows healthy / overweight etc." },
    { k: "new", zh: "「问 AI 这些体征」：带上各项数和同龄参考范围，直接去咩咩咩问", en: "\"Ask AI about these\" opens the AI page with the numbers and age ranges attached" }
  ] },
  { v: "2026-11-14.2", title: { zh: "体检单多读 BMI、血压、百分位；重扫不重复", en: "Checkups: BMI, blood pressure, percentiles; no repeats on re-scan" }, items: [
    { k: "new", zh: "两岁以后的体检单：AI 会一起读出 BMI、血压、心率和体重 / 身高 / BMI 的同龄百分位", en: "For checkups after age 2, AI also reads BMI, blood pressure, pulse and the age percentiles" },
    { k: "better", zh: "同一天的单子再扫一次，会更新原来那条记录、补上新的数，不会多记一条", en: "Re-scanning a sheet from the same day updates that record with the new numbers instead of adding another" },
    { k: "better", zh: "已经记过的针、药、里程碑默认不勾；勾上就更新原来那条", en: "Shots, medicines and milestones already logged are unchecked; check one to update it" }
  ] },
  { v: "2026-11-14.1", title: { zh: "修好：拍疫苗本可以一次录入很多针", en: "Fixed: scan a whole vaccine record at once" }, items: [
    { k: "fix", zh: "拍疫苗本 / 接种记录表，AI 会把表里每一针都读出来，每针用自己的接种日期", en: "Scanning a vaccine record table now reads every dose, each with its own date" },
    { k: "better", zh: "已经记过的针默认不勾，免得记重；每针的日期都可以改", en: "Shots you already logged are unchecked so nothing is doubled; each date can be edited" }
  ] },
  { v: "2026-11-12.3", title: { zh: "问咩咩咩可以带照片和文件", en: "Ask with photos and files" }, items: [
    { k: "new", zh: "提问框下面可以拍照、选多张图片或 PDF 一起问，每张都能删", en: "Add several photos or PDFs under the question box; remove any of them" }
  ] },
  { v: "2026-11-12.2", title: { zh: "成长各页都能按时间翻看记录，点一条就能改", en: "Every Growth page lists its records by time, tap one to edit" }, items: [
    { k: "better", zh: "里程碑、新食物、睡眠、体重身高、体检就诊、疫苗：都有和「记录」页一样的时间线，可按时间范围和类别筛选，列表 / 时间轴两种看法", en: "Milestones, new foods, sleep, weight & height, checkups and vaccines all get a timeline like the Log page, with time and type filters and list / axis views" },
    { k: "better", zh: "点任何一条记录就能修改或删除", en: "Tap any record to edit or delete it" },
    { k: "fix", zh: "AI 一次录入：文字框和下面的按钮之间留出了距离", en: "AI logging: more space between the text box and the buttons" }
  ] },
  { v: "2026-11-12.1", title: { zh: "AI 录入：照片、文件一格一格显示，可以删", en: "AI logging: photos and files as thumbnails you can remove" }, items: [
    { k: "better", zh: "体检录入可以拍很多次、一次选多张，每张缩略图右上角 × 就能删；也能选 PDF", en: "Checkup logging: take as many photos as you like, pick several at once, tap × to remove one; PDFs work too" },
    { k: "better", zh: "文字框跟着粘贴的内容长高，不用一开始就滑动", en: "Text boxes grow with what you paste, so you don't have to scroll right away" }
  ] },
  { v: "2026-11-11.3", title: { zh: "体检提醒表更整齐", en: "Tidier checkup schedule" }, items: [
    { k: "better", zh: "表头和日期、勾选列居中对齐；最后一列改名「完成」", en: "Headers, dates and the tick column are centered; the last column is now \"Done\"" }
  ] },
  { v: "2026-11-11.2", title: { zh: "体检日期带星期；顶栏不再被盖住", en: "Checkup dates show the weekday; header no longer covered" }, items: [
    { k: "better", zh: "儿科体检与就诊：日期后面显示星期几", en: "Checkups & visits: each date shows its weekday" },
    { k: "better", zh: "体检时间表最后一列合成「完成 / 已去」，只留一个勾", en: "The checkup schedule's last column is now a single \"Done\" tick" },
    { k: "fix", zh: "电脑上打开再关掉表单后，顶上的窄条不再盖住顶栏", en: "On a laptop, closing a form no longer leaves the slim bar covering the header" }
  ] },
  { v: "2026-11-11.1", title: { zh: "体检 / 就诊可以让 AI 一次录入", en: "Log a whole checkup or visit at once with AI" }, items: [
    { k: "new", zh: "拍就诊小结、体检单或疫苗本，或者打一段话，AI 读出体征、疫苗、医生建议、维生素和里程碑", en: "Snap the visit summary, checkup sheet or vaccine card, or type a few lines; AI picks out measurements, shots, advice, vitamins and milestones" },
    { k: "new", zh: "在一张表里核对、修改、取消不要的，一次保存成好几条记录", en: "Check, edit or untick items on one page, then save them all as separate records" },
    { k: "better", zh: "入口在 成长 页最上面、儿科体检与就诊、疫苗接种记录", en: "Find it at the top of Growth, and on the checkups and vaccine pages" }
  ] },
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
