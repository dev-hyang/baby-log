// 家庭学堂 · 有版权译本代理（Supabase Edge Function）
// 为什么需要：api.esv.org 不允许浏览器直接跨域；API.Bible 虽允许，但密钥放进前端就等于公开。这个函数在服务端带密钥转发，再把纯文本返回给网页。
//
// 支持的 v（版本标签）：
//   ESV            → Crossway ESV API（免费非商业密钥：https://api.esv.org/）
//   NASB NIV CSB NKJV（及其它）→ API.Bible（https://scripture.api.bible/ 免费 Starter：非商业、每月 5000 次、可选 3 本有版权译本）
//
// 部署（装好 Supabase CLI 并 supabase login 后，在 supabase/ 的父目录执行；函数名沿用 esv，网页里填的地址不用改）：
//   supabase functions deploy esv --project-ref <项目 ref> --no-verify-jwt
//   supabase secrets set ESV_API_KEY=<Crossway 密钥> --project-ref <项目 ref>
//   supabase secrets set APIBIBLE_KEY=<API.Bible 密钥> --project-ref <项目 ref>
//   supabase secrets set APIBIBLE_IDS="NASB=<bibleId>,NIV=<bibleId>,CSB=<bibleId>,NKJV=<bibleId>" --project-ref <项目 ref>
//     bibleId 在 API.Bible 后台选好 3 本有版权译本后，在 GET https://api.scripture.api.bible/v1/bibles 的返回里找（字段 id，形如 "a81b73293d3080c9-01"）。
// 然后在家庭学堂 设置 → 抓取译本与代理 填：https://<项目 ref>.supabase.co/functions/v1/esv
//
// 各译本的引用条款（非商业、节数上限、须注明译本）由这个家庭自己遵守；函数只做转发。
const ESV_KEY = Deno.env.get("ESV_API_KEY") ?? "";
const APIBIBLE_KEY = Deno.env.get("APIBIBLE_KEY") ?? "";
const APIBIBLE_IDS: Record<string, string> = Object.fromEntries((Deno.env.get("APIBIBLE_IDS") ?? "").split(",").map(s => s.trim()).filter(Boolean).map(s => { const i = s.indexOf("="); return [s.slice(0, i).trim().toUpperCase(), s.slice(i + 1).trim()]; }));
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json", "cache-control": "public, max-age=86400" } });

async function esv(q: string) {
  if (!ESV_KEY) return json({ error: "ESV_API_KEY not set" }, 500);
  const params = new URLSearchParams({ q, "include-headings": "false", "include-footnotes": "false", "include-verse-numbers": "false", "include-short-copyright": "false", "include-passage-references": "false", "indent-paragraphs": "0" });
  const r = await fetch(`https://api.esv.org/v3/passage/text/?${params}`, { headers: { Authorization: `Token ${ESV_KEY}` } });
  const j = await r.json();
  const text = Array.isArray(j.passages) ? j.passages.join(" ").replace(/\s+/g, " ").trim() : "";
  return json({ text, canonical: j.canonical ?? q, version: "ESV" }, r.ok ? 200 : r.status);
}

async function apiBible(version: string, pid: string) {
  if (!APIBIBLE_KEY) return json({ error: "APIBIBLE_KEY not set" }, 500);
  const bibleId = APIBIBLE_IDS[version.toUpperCase()];
  if (!bibleId) return json({ error: `no bibleId for ${version}; set APIBIBLE_IDS` }, 400);
  const params = new URLSearchParams({ "content-type": "text", "include-notes": "false", "include-titles": "false", "include-chapter-numbers": "false", "include-verse-numbers": "false", "include-verse-spans": "false", "use-org-id": "false" });
  const r = await fetch(`https://api.scripture.api.bible/v1/bibles/${bibleId}/passages/${encodeURIComponent(pid)}?${params}`, { headers: { "api-key": APIBIBLE_KEY } });
  const j = await r.json();
  const d = j.data ?? {};
  const text = String(d.content ?? "").replace(/\s+/g, " ").trim();
  // API.Bible 的 fair-use 要求：返回里带 meta.fumsToken，正式产品应上报阅读量；家庭自用先原样透传。
  return json({ text, canonical: d.reference ?? pid, version: version.toUpperCase(), copyright: d.copyright ?? "", fums: j.meta?.fumsToken ?? "" }, r.ok ? 200 : r.status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const u = new URL(req.url);
  const v = (u.searchParams.get("v") ?? "ESV").toUpperCase(), q = u.searchParams.get("q") ?? "", pid = u.searchParams.get("pid") ?? "";
  if (!q && !pid) return json({ error: "missing q / pid" }, 400);
  if (v === "ESV") return await esv(q || pid);
  return await apiBible(v, pid || q);
});
