import test from "node:test";
import assert from "node:assert/strict";
import { bmiBand, bpLimit, flag, hrRange, segs, vitalsContext, vitalsHTML } from "../js/vitals.js";

const t = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ""));
const DAY = 864e5, birth = new Date("2021-06-01T00:00:00").getTime();
const months = ts => Math.floor((ts - birth) / (30.44 * DAY));
const ctx = { t, val: (d, v) => +v, unit: d => (d === "weight" ? "kg" : "cm"), day: ts => new Date(ts).toISOString().slice(0, 10).replace(/-/g, "/"), months, sex: null, src: () => "儿科体检" };

test("heart rate ranges by age (AHA PALS)", () => {
  assert.deepEqual(hrRange(1), { lo: 85, hi: 205 }); assert.deepEqual(hrRange(12), { lo: 100, hi: 190 });
  assert.deepEqual(hrRange(24), { lo: 60, hi: 140 }); assert.deepEqual(hrRange(150), { lo: 60, hi: 100 });
  assert.equal(hrRange(null), null);
});

test("blood pressure screening limits (AAP 2017 simplified table)", () => {
  assert.equal(bpLimit(6), null);                                   // under 1: not routine
  assert.deepEqual(bpLimit(4 * 12 + 3, "m"), { sys: 102, dia: 60 });
  assert.deepEqual(bpLimit(4 * 12 + 3, "f"), { sys: 103, dia: 62 });
  assert.deepEqual(bpLimit(4 * 12, null), { sys: 102, dia: 60 });    // unknown sex: the lower one
  assert.deepEqual(bpLimit(14 * 12), { sys: 120, dia: 80 });
});

test("flags and BMI bands", () => {
  assert.equal(flag("pulse", 150, 60), "高"); assert.equal(flag("pulse", 90, 60), null); assert.equal(flag("pulse", 50, 60), "低");
  assert.equal(flag("bp_sys", 104, 60, "m"), "高"); assert.equal(flag("bp_dia", 59, 60, "m"), null);
  assert.equal(flag("bmipct", 90), "高"); assert.equal(flag("bmipct", 50), null); assert.equal(flag("wpct", 2), "低"); assert.equal(flag("lpct", 98), "高");
  assert.equal(bmiBand(4), "偏瘦"); assert.equal(bmiBand(84), "健康体重"); assert.equal(bmiBand(85), "超重"); assert.equal(bmiBand(95), "肥胖");
});

test("age segments switch at 2 years for heart rate", () => {
  const s = segs(birth + 20 * 30.44 * DAY, birth + 30 * 30.44 * DAY, months, hrRange);
  assert.deepEqual(s.map(x => x.v.lo), [100, 60]);
});

test("cards: only measured vitals appear; out-of-range points are flagged; context has ranges", () => {
  const rows = [
    { ts: new Date("2025-10-20T09:00:00").getTime(), weight: 18.3, wpct: 64, bp_sys: 108, bp_dia: 62, pulse: 102 },
    { ts: new Date("2024-10-05T09:00:00").getTime(), weight: 15.1, wpct: 61 }
  ];
  const html = vitalsHTML(rows, ctx);
  assert.match(html, /data-vt="weight"/); assert.match(html, /data-vt="bp"/); assert.match(html, /data-vt="pulse"/);
  assert.doesNotMatch(html, /data-vt="bmi"/); assert.doesNotMatch(html, /data-vt="head"/);
  assert.match(html, /P64/); assert.match(html, /2025\//);              // percentile tag and year on the axis
  assert.match(html, /vt-flag bad/);                                    // 108 systolic at 4 y is above the screening line
  const c = vitalsContext(rows, ctx);
  assert.match(c, /18\.3 P64/); assert.match(c, /60–140/); assert.doesNotMatch(c, /名字|name/i);
});
