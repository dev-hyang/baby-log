import { t } from "./i18n.js";

/* ============ long lists: one page at a time ============
   Timeline, clinic visits, milestones, new foods and vaccines render only the first `shown` rows; everything else
   (filter, sort, day groups, gaps, totals) is still worked out on the full list. "继续加载" adds one more page.
   The page size is a per-device preference like the list style; unset, phones get 10 and wider screens 20. */
const PAGE_KEY = "baby.pageSize", PAGE_SIZES = [5, 10, 20, 50];
function pageSize(){
  try { const v = +localStorage.getItem(PAGE_KEY); if (PAGE_SIZES.includes(v)) return v; } catch (e) { /* storage may be unavailable */ }
  try { return matchMedia("(max-width: 640px)").matches ? 10 : 20; } catch (e) { return 20; }
}
function setPageSize(n){ if (!PAGE_SIZES.includes(+n)) return; try { localStorage.setItem(PAGE_KEY, String(+n)); } catch (e) { /* only a convenience */ } PG.lists = {}; }

// lists[id] = { sig, n }: sig is what the list is showing (child, filter, search, day …); when it changes the list starts again at one page
const PG = { nav: "", lists: {} };
// how many rows list `id` shows now
function shownOf(id, sig){
  let s = PG.lists[id];
  if (!s || s.sig !== sig) s = PG.lists[id] = { sig, n: pageSize() };
  return s.n;
}
// leaving the page (another tab, log view or checkup view): every list starts again at one page
function pagerNav(key){ if (key !== PG.nav) { PG.nav = key; PG.lists = {}; } }
function loadMore(id){ const s = PG.lists[id]; if (s) s.n += pageSize(); }
// the single "继续加载" button under a list, only while rows are still hidden
const moreHTML = (id, total, n) => total > n ? `<div class="btns" style="justify-content:center;margin-top:12px"><button type="button" class="btn" data-more="${id}">${t("继续加载")}</button></div>` : "";

export { PAGE_SIZES, pageSize, setPageSize, shownOf, pagerNav, loadMore, moreHTML };
