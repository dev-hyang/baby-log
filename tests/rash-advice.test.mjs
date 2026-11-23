import test from "node:test";
import assert from "node:assert/strict";
import { rashAdvice } from "../js/rash-advice.js";

test("no rash, old records and other types give no advice", () => {
  assert.equal(rashAdvice(null), null);
  assert.equal(rashAdvice({ type: "diaper" }), null);
  assert.equal(rashAdvice({ type: "diaper", rash: "无" }), null);
  assert.equal(rashAdvice({ type: "feed", rash: "严重" }), null);
});

test("cream applied last time: advice says to continue", () => {
  const a = rashAdvice({ type: "diaper", rash: "中等", cream: true });
  assert.equal(a.continued, true);
  assert.equal(a.level, "mid");
  assert.match(a.text, /继续/);
  assert.match(rashAdvice({ type: "diaper", rash: "严重", cream: true }).text, /儿科医生/);
  assert.equal(rashAdvice({ type: "diaper", rash: "无", cream: true }), null);
});

test("each rash level maps to its own advice", () => {
  assert.equal(rashAdvice({ type: "diaper", rash: "轻微" }).level, "mild");
  assert.equal(rashAdvice({ type: "diaper", rash: "中等" }).level, "mid");
  const s = rashAdvice({ type: "diaper", rash: "严重" }, (x) => x);
  assert.equal(s.level, "severe");
  assert.match(s.text, /儿科医生/);
});
