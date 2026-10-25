/* ============ 云端协作配置（Supabase） ============
   在 Supabase 后台 Project Settings → API（或 Data API）里复制下面两项。
   只能填 anon / publishable 公开 key（设计上就是给浏览器用的，安全靠数据库的行级权限 RLS）。
   绝对不要填 service_role / secret key —— 它能绕过所有权限。
   保持占位符不改，网站就以“仅本机保存”模式运行。 */
const SUPABASE_URL = "https://gbhvqlraimmignhoczww.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaHZxbHJhaW1taWduaG9jend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3ODY5MzAsImV4cCI6MjEwNzM2MjkzMH0.Y9ZzQKGChGqnLj-69Bnljgb8BVgXbOEuHbbKt6Z5bBE";
// 国内若 jsDelivr 不稳定：把这个文件下载下来放进仓库，改成 "./supabase.js"
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";

/* ---- 云盘备份（可选）：我的 → 同步、备份与恢复 里的 Google Drive / Dropbox。留空就只显示「未配置」。怎么申请见 README「云盘备份」。
   两个都是公开的客户端标识（不是密钥），和上面的 anon key 一样可以放在网页里。 */
const GOOGLE_CLIENT_ID = "84515417841-qgscfp9qnr11os6avv5cjqs9pjtgu3o3.apps.googleusercontent.com";   // Google Cloud Console → OAuth 2.0 客户端（Web 应用）；「已获授权的 JavaScript 来源」填站点地址
const GOOGLE_API_KEY = "AIzaSyC300sDjN0CZwtKmF-2Gupcj6sKd4epUaI";     // Google Cloud Console → 凭据 → API 密钥（限制为 Google Picker API）；用于「在 Drive 里选文件夹」，留空就只能填路径
const DROPBOX_APP_KEY = "";    // Dropbox App Console → App key；Access type 选 App folder；Redirect URI 填站点地址（带结尾的 /）

export { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JS, GOOGLE_CLIENT_ID, GOOGLE_API_KEY, DROPBOX_APP_KEY };
