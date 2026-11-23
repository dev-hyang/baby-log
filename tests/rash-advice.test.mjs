import test from "node:test";
import assert from "node:assert/strict";
import { rashAdvice } from "../js/rash-advice.js";

test("no rash, old records and other types give no advice", () => {
  assert.equal(rashAdvice(null), null);
  assert.equal(rashAdvice({ type: "diaper" }), null);
  assert.equal(rashAdvice({ type: "diaper", rash: "无" }), null);
  assert.equal(rashAdvice({ type: "feed", rash: "严重" }), null);
});

test("each rash level maps to its own advice", () => {
  assert.equal(rashAdvice({ type: "diaper", rash: "轻微" }).level, "mild");
  assert.equal(rashAdvice({ type: "diaper", rash: "中等" }).level, "mid");
  const s = rashAdvice({ type: "diaper", rash: "严重" }, (x) => x);
  assert.equal(s.level, "severe");
  assert.match(s.text, /儿科医生/);
});
