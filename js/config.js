/* ============ 云端协作配置（Supabase） ============
   在 Supabase 后台 Project Settings → API（或 Data API）里复制下面两项。
   只能填 anon / publishable 公开 key（设计上就是给浏览器用的，安全靠数据库的行级权限 RLS）。
   绝对不要填 service_role / secret key —— 它能绕过所有权限。
   保持占位符不改，网站就以“仅本机保存”模式运行。 */
const SUPABASE_URL = "https://gbhvqlraimmignhoczww.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaHZxbHJhaW1taWduaG9jend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3ODY5MzAsImV4cCI6MjEwNzM2MjkzMH0.Y9ZzQKGChGqnLj-69Bnljgb8BVgXbOEuHbbKt6Z5bBE";
// 国内若 jsDelivr 不稳定：把这个文件下载下来放进仓库，改成 "./supabase.js"
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";

export { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JS };
