/* 尿布疹：根据上一次换尿布记录的严重程度，建议这次要不要抹药膏。纯函数（tr = 翻译函数），测试见 tests/rash-advice.test.mjs。
   级别按记录里存的原值：无 / 轻微 / 中等 / 严重（没填过的老记录当作「无」，不提示）。 */
const RASH_LEVELS = ["无", "轻微", "中等", "严重"];

/** 上次那条尿布记录 e → { level: "mild" | "mid" | "severe", apply: 要不要抹, text } ；没有尿布疹返回 null */
function rashAdvice(e, tr = (s) => s){
  if (!e || e.type !== "diaper") return null;
  switch (e.rash) {
    case "轻微": return { level: "mild", apply: true, text: tr("上次有轻微尿布疹：这次可以薄薄涂一层护臀膏") };
    case "中等": return { level: "mid", apply: true, text: tr("上次尿布疹中等：这次建议涂护臀膏，并让屁股多透透气") };
    case "严重": return { level: "severe", apply: true, text: tr("上次尿布疹严重：这次建议涂药膏；如果破皮、起水泡或 3 天没好转，请联系儿科医生") };
    default: return null;
  }
}
export { RASH_LEVELS, rashAdvice };
