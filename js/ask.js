import { answerLang, t } from "./i18n.js";
import { S, ageMonths, babyAgeDays, stageOf } from "./state.js";
import { trim } from "./units.js";
import { $ } from "./util.js";

/* ============ AI ask (sample capability) ============ */
let askCtl = null;
async function ask(){
  const q = $("#askq")?.value.trim(); if (!q || !S.sample) return;
  const out = $("#answer"); out.textContent = t("正在思考…");
  askCtl?.abort(); askCtl = new AbortController();
  const ad = babyAgeDays(), m = ageMonths(), stage = stageOf();
  // the instructions stay in Chinese; only the answer language follows the interface
  const prompt = `你是一位谨慎、温和的儿童健康与育儿科普助手，用${answerLang()}回答父母的问题。
要求：依据美国儿科学会（AAP）、WHO、ACOG、CDC 等权威机构的公开建议给出一般性信息；
控制在 250 字（英文 180 词）以内，分 2–4 个短段落；不做诊断，不给具体药物剂量；
若问题涉及以下危险信号（3个月内发热≥38℃、呼吸困难、嗜睡难叫醒、脱水、产后大出血、胸痛、伤害自己或宝宝的念头等），第一句就明确建议立即就医。
最后一句提醒具体情况以医生意见为准。
${ad != null && ad >= 0 ? (m < 24 ? `孩子目前出生 ${ad} 天（${m} 个月），处于${stage.name}。` : `孩子目前 ${Math.floor(m / 12)} 岁 ${m % 12} 个月，处于${stage.name}。`) : ""}
问题：${q}`;
  try {
    const r = await S.sample(prompt, { signal: askCtl.signal, cache: false, onText: ({ text }) => { out.textContent = text; } });
    out.textContent = r.text;
  } catch (e) {
    out.textContent = e?.code === "not_granted" ? t("需要允许这个页面使用 Claude 才能提问。") : e?.code === "rate_limited" ? t("提问太频繁了，请稍后再试。") : (e?.text || t("暂时没能得到回答，请稍后再试。"));
  }
}

export { askCtl, ask };
