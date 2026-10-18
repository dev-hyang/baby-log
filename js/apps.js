/* ============ sister apps ============
   The family's other tools. The header shows the previous / next app as small arrow badges beside the
   title (same design as homeschool); the ⋮ menu on narrow screens and the settings page list them all.
   Names and short names are dictionary keys like everything else; `key` marks which one this page is. */
const APPS = [
  { key: "baby", name: "小月亮 · 母婴记录", short: "小月亮", url: "https://dev-hyang.github.io/baby-log/" },
  { key: "homeschool", name: "家庭学堂 · 在家教育", short: "学堂", url: "https://dev-hyang.github.io/homeschool/" },
  { key: "pantry", name: "爱家小助手", short: "小助手", url: "https://dev-hyang.github.io/home-pantry/" }
];
const THIS_APP = "baby";

export { APPS, THIS_APP };
