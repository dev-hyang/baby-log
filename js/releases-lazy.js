/* 发布日志数据（releases-data.js）按需加载：只有「新版本」提示还会出现、或打开发布日志页时才下载。
   releases-ui.js 是四个姊妹应用共用的文件，这里只在应用这边接线，不改它。 */
import { APP_VERSION } from "./state.js";
import { initReleases } from "./releases-ui.js";
import { lang } from "./i18n.js";
import { importFresh } from "./lazy-reload.js";

let ready = false, loading = null;
const releasesReady = () => ready;
function loadReleases(){
  return (loading ||= importFresh(() => import("./releases-data.js")).then(({ RELEASES }) => {
    initReleases({ version: APP_VERSION, releases: RELEASES, lang, accent: "var(--slate)", appId: "baby-log", open: 'data-tab="releases"' });
    ready = true;
  }).catch(() => { loading = null; }));
}
/** 「新版本」提示这台设备还会不会出现（读 releases-ui.js 记的 seen / shows）：不会了就不用为它下载数据 */
function releaseBadgePossible(){
  try {
    if (localStorage.getItem("baby-log.rl.seen") === APP_VERSION) return false;
    const o = JSON.parse(localStorage.getItem("baby-log.rl.shows") || "{}");
    return !(o.v === APP_VERSION && +o.n >= 5);
  } catch (e) { return true; }
}
export { releasesReady, loadReleases, releaseBadgePossible };
