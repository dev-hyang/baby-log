/* ============ 一条体检 / 就诊 / 化验记录的 AI 解读（小月亮和家庭学堂同一份，改了两边一起改） ============
   纯函数：提示词、解析模型回复、画解读内容。各应用自己拼输入（年龄、体征和同龄范围、医生写的总结 / 建议、同一天的疫苗 / 用药 / 化验……，不含姓名）、
   自己存（小月亮 / 家庭学堂的记录存在记录里的 ai；牧羊人的就诊存 hl_visits.ai；化验存档案 data.ai_labdays）。
   格式和牧羊人的就诊解读一样（plain / agree / differ / questions），多了 advice（医生建议是什么意思、怎么做）和 follow（后续注意），
   所以牧羊人也能显示这里存的解读。 */

/** 界面语言 → 让模型用哪种语言回答 */
export const aiLangName = l => ({ "zh-TW": "Traditional Chinese", en: "English" }[l] || "Simplified Chinese");

export const REC_AI_SYSTEM = lang => `You explain a child's pediatric record (a well-child checkup, a sick visit, or lab results) to a parent in plain language. You are not a doctor.
Input is de-identified JSON: age, sex, record kind, measurements with percentiles and the normal range for this age, the doctor's own summary and advice as written, vaccines / medicines / labs from the same day, and earlier values for trends.
Reply ONLY with JSON: {"plain":"3-5 sentences: what this visit or these results show overall","advice":["each piece of the doctor's advice: what it means and how to do it at home (empty if the input has no advice)"],"follow":["what to keep an eye on next, when to recheck, and warning signs that need a doctor sooner"],"agree":["where the numbers support the doctor's assessment"],"differ":["anything worth raising with the doctor, phrased as a topic to ask about, never as a contradiction"],"questions":["up to 4 concrete questions for the next visit"]}.
Use the given normal ranges and the lab's own reference ranges. Never diagnose, never suggest starting, stopping or changing a medicine. Keep each item short. Write in ${aiLangName(lang)}.`;

/** 模型回复 → { at, plain, advice[], follow[], agree[], differ[], questions[] }；不是 JSON 返回 null */
export function parseRecAi(raw, now = new Date()){
  let o; try { o = JSON.parse(String(raw).replace(/^\s*```(json)?|```\s*$/g, "").trim()); } catch (e) { return null; }
  if (!o || typeof o !== "object") return null;
  const arr = x => (Array.isArray(x) ? x.map(y => String(y).slice(0, 400)).filter(Boolean).slice(0, 6) : []);
  const a = { at: now.toISOString(), plain: String(o.plain || "").slice(0, 1500), advice: arr(o.advice), follow: arr(o.follow), agree: arr(o.agree), differ: arr(o.differ), questions: arr(o.questions) };
  return a.plain || a.advice.length || a.follow.length ? a : null;
}

/** 解读的内容（段落 + 几组要点）；t / esc 由调用方给 */
export function recAiBody(a, t, esc){
  const list = (title, arr) => (arr && arr.length ? `<b>${esc(t(title))}</b><ul>${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
  return `${a.plain ? `<p>${esc(a.plain)}</p>` : ""}${list("医生建议是什么意思、怎么做", a.advice)}${list("后续注意", a.follow)}${list("和医生意见一致的", a.agree)}${list("可以问问医生的", a.differ)}${list("下次可以问的问题", a.questions)}`;
}
