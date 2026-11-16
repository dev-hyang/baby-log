import test from "node:test";
import assert from "node:assert/strict";
import { REC_AI_SYSTEM, aiLangName, parseRecAi, recAiBody } from "../js/record-ai.js";

const t = s => s, esc = s => String(s).replace(/</g, "&lt;");

test("prompt asks for the parent's language and the shared format", () => {
  assert.equal(aiLangName("en"), "English"); assert.equal(aiLangName("zh-TW"), "Traditional Chinese"); assert.equal(aiLangName("zh-CN"), "Simplified Chinese");
  assert.match(REC_AI_SYSTEM("en"), /Write in English\./); assert.match(REC_AI_SYSTEM("zh-CN"), /"advice"/); assert.match(REC_AI_SYSTEM("zh-CN"), /"follow"/);
});

test("reply parsing: fenced JSON, trimmed lists, junk rejected", () => {
  const a = parseRecAi("```json\n" + JSON.stringify({ plain: "All normal.", advice: ["Less juice", "", 3], follow: Array(9).fill("x"), questions: "not a list" }) + "\n```", new Date("2026-11-15T10:00:00Z"));
  assert.equal(a.plain, "All normal."); assert.deepEqual(a.advice, ["Less juice", "3"]); assert.equal(a.follow.length, 6); assert.deepEqual(a.questions, []);
  assert.equal(a.at, "2026-11-15T10:00:00.000Z");
  assert.equal(parseRecAi("sorry, I can't"), null); assert.equal(parseRecAi("{}"), null);
});

test("body escapes text and skips empty groups", () => {
  const h = recAiBody({ plain: "<b>hi</b>", advice: ["a"], follow: [], agree: [], differ: [], questions: [] }, t, esc);
  assert.match(h, /&lt;b>hi/); assert.match(h, /医生建议是什么意思/); assert.doesNotMatch(h, /后续注意/);
});
