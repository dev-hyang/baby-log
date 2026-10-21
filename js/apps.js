/* ============ sister apps ============
   The family's other tools. The header shows the previous / next app as small arrow badges beside the
   title (same design as homeschool); the 我的 page lists them with a one-line description.
   Names, short names and descriptions are dictionary keys like everything else; `key` marks this page. */
const APPS = [
  { key: "baby", name: "小月亮 · 母婴记录", short: "小月亮", url: "https://dev-hyang.github.io/baby-log/", desc: "宝宝日常记录：喂奶、睡眠、尿布、成长曲线。" },
  { key: "homeschool", name: "家庭学堂 · 在家教育", short: "学堂", url: "https://dev-hyang.github.io/homeschool/", desc: "以信仰为中心的在家教育：敬拜、经文背诵、课程、资源、日历、报告。" },
  { key: "pantry", name: "爱家小助手", short: "小助手", url: "https://dev-hyang.github.io/home-pantry/", desc: "家庭库存与采购清单、按库存推荐三餐、房屋维护与装备清单。" },
  { key: "shepherd", name: "牧羊人 · 身心灵记录", short: "牧羊人", url: "https://dev-hyang.github.io/shepherd/", desc: "大人自己的读经、祷告、锻炼、饮食、屏幕时长、用药与保健品，提醒与趋势。" }
];
const THIS_APP = "baby";

export { APPS, THIS_APP };
