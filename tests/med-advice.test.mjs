import test from "node:test";
import assert from "node:assert/strict";
import { heroOff, ruleFor, timingOf, timingText, nextDoseAt, medInfo } from "../js/med-advice.js";

const t = (k, v) => k.replace(/\{(\w+)\}/g, (_, n) => v[n]);
const rules = [{ name: "布洛芬", hours: "6", timing: "饭后", mins: "30", note: "胃不舒服就停" }, { name: "铁剂", hours: "", timing: "空腹" }];

test("rule is found by name containment", () => {
  assert.equal(ruleFor(rules, "布洛芬缓释片").name, "布洛芬");
  assert.equal(ruleFor(rules, "泰诺"), null);
  assert.equal(ruleFor(null, "x"), null);
});

test("entry timing wins over rule; 不限 falls through to the rule", () => {
  assert.deepEqual(timingOf({ timing: "饭前", mins: 20 }, rules[0]), { timing: "饭前", mins: 20 });
  assert.deepEqual(timingOf({ timing: "不限" }, rules[0]), { timing: "饭后", mins: 30 });
  assert.equal(timingOf({}, null), null);
});

test("minutes only count for before / after meals", () => {
  assert.deepEqual(timingOf({ timing: "空腹", mins: 30 }, null), { timing: "空腹", mins: 0 });
  assert.equal(timingText({ timing: "饭后", mins: 30 }, t), "饭后 30 分钟");
  assert.equal(timingText({ timing: "饭后", mins: 0 }, t), "饭后");
  assert.equal(timingText(null, t), "");
});

test("next dose needs a minimum interval", () => {
  assert.equal(nextDoseAt(1000, rules[0]), 1000 + 6 * 3600e3);
  assert.equal(nextDoseAt(1000, rules[1]), null);
  assert.equal(nextDoseAt(1000, null), null);
});

test("medInfo bundles it all", () => {
  const i = medInfo({ name: "布洛芬", entry: { ts: 5 }, rules, count24: 2 });
  assert.equal(i.count24, 2);
  assert.equal(i.note, "胃不舒服就停");
  assert.equal(i.tm.timing, "饭后");
  assert.ok(i.next > 5);
});

test("heroOff: a rule can switch a medicine off the top card", () => {
  const rs = [{ name: "布洛芬", hero: "off" }, { name: "铁剂" }];
  assert.equal(heroOff({ name: "布洛芬缓释片" }, rs), true);
  assert.equal(heroOff({ name: "铁剂" }, rs), false);
  assert.equal(heroOff({ name: "泰诺" }, rs), false);
  assert.equal(heroOff({ cat: "维生素" }, rs), false);
  assert.equal(heroOff({ name: "布洛芬" }, null), false);
});
