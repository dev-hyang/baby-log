import { t } from "./i18n.js";
import { dashBarHTML, dashGearHTML, dashSecs, markDash, watchDashCycle } from "./shared/ui-dashbar.js";

/* ============ 顶部卡片自动换（11-08；2026-11-27 起改用统一控件 shared/ui-dashbar.js，姊妹应用同一套） ============
   卡片下面一行：‹ 进度短划线 › ⚙。当前那条像进度条慢慢走满（默认 10 秒）就到下一张，循环。
   手指按着、鼠标停在卡片上、键盘焦点在里面、⚙ 菜单开着时停住；手动滑 / 点过从头走；系统减少动态效果时不走。
   ⚙ 选 5 / 10 / 15 / 30 秒或关掉，记在这台设备上。控件本身在 shared/ui-dashbar.js，这里只接上宝宝日志的轨道（循环轨道、睡着时不自动换）。 */
const KEY = "baby.cardSecs";
export const cardSecs = () => dashSecs(KEY);

/** 控制行（n 张卡、当前第 cur 张）；宝宝睡着时停在睡眠卡，不自动换（手动滑照样可以） */
export function heroCtrlHTML(n, cur, { asleep = false } = {}){
  return dashBarHTML(n, cur, { clickable: true, attrs: 'data-herobar="dot"', nav: true, navAttrs: 'data-herobar="nav"', gear: dashGearHTML({ secs: cardSecs(), t }), secs: asleep ? 0 : cardSecs(), label: "顶部大计时", t });
}
/** 当前那条：换成第 i 条，进度条从头走 */
export function markHeroDash(box, i){ markDash(box?.querySelector(".ui-dashbar"), i); }

let goNext = () => {};
/** app.js 接上：怎么换到下一张（要先把循环轨道拉回中间那份） */
export function initHeroCycle({ next }){ goNext = next; }
watchDashCycle({ key: KEY, next: bar => {   // 进度条走满
  const tr = bar?.closest(".herobox")?.querySelector(".herotrack"); if (tr && !tr._down && !tr.querySelector(".hero.sleeping")) goNext(tr);
} });
