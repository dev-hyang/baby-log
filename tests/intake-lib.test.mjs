import test from "node:test";
import assert from "node:assert/strict";
import { medCat, parseIntake, vaxDose, vaxName, vaxSeen, vaxSite } from "../js/intake-lib.js";

test("a whole checkup becomes metric vitals, vaccines, meds and milestones", () => {
  const r = parseIntake("```json\n" + JSON.stringify({
    date: "2026-10-20", kind: "checkup", clinic: "Sunny Pediatrics",
    vitals: { weight_lb: 20, weight_oz: 5, length_in: 29, head_cm: 45.2, temp_f: 98.6 },
    summary: "Growing well. Keep vitamin D.", next_visit: "12 months",
    vaccines: [{ name: "DTaP", dose: 3, site: "left thigh" }, { name: "Pediarix", dose: "3", site: "R thigh" }, { name: "Influenza", dose: "booster", site: "left arm" }],
    meds: [{ kind: "vitamin_d", name: "D-Vi-Sol", dose: "400 IU daily" }, { name: "Ferrous sulfate drops", dose: "1 ml" }],
    milestones: [{ name: "Pulls to stand", area: "gross_motor" }, "Says mama"]
  }) + "\n```");
  assert.equal(r.day, "2026-10-20"); assert.equal(r.src, "儿科体检"); assert.equal(r.clinic, "Sunny Pediatrics");
  assert.equal(r.weight, 9.214); assert.equal(r.length, 73.7); assert.equal(r.head, 45.2); assert.equal(r.temp, 37);
  assert.equal(r.next, "12 months");
  assert.deepEqual(r.vaccines[0], { name: "百白破 DTaP", day: null, dose: "第3剂", site: "左大腿" });
  assert.deepEqual(r.vaccines[1], { name: "百白破 DTaP（Pediarix）", day: null, dose: "第3剂", site: "右大腿" });
  assert.deepEqual(r.vaccines[2], { name: "流感疫苗 Flu（Influenza）", day: null, dose: "加强", site: "左上臂" });
  assert.deepEqual(r.meds.map(m => m.cat), ["维生素D", "铁剂"]);
  assert.deepEqual(r.milestones, [{ name: "Pulls to stand", cat: "大运动" }, { name: "Says mama", cat: "认知" }]);
});

test("a sick visit from typed Chinese text; impossible values are dropped", () => {
  const r = parseIntake(JSON.stringify({ kind: "sick", vitals: { temp_c: 38.6, weight_kg: 155 }, summary: "中耳炎，阿莫西林 5 天", meds: [{ kind: "medicine", name: "阿莫西林", dose: "5ml 一天两次" }] }));
  assert.equal(r.src, "看病/急诊"); assert.equal(r.temp, 38.6); assert.equal(r.weight, null);
  assert.equal(r.meds[0].cat, "药物"); assert.equal(r.day, null);
});

test("a vaccine record table: every dated dose, each with its own date; no vitals needed", () => {
  const rows = [];
  for (const [name, dates] of [["HepB", ["2020-01-02", "2020-02-03", "2020-07-04"]], ["DTaP", ["2020-03-05", "2020-05-06", "2020-07-04", "2021-04-10"]], ["MMR", ["2021-01-08"]], ["Varicella", ["2021-01-08"]], ["IPV", ["2020-03-05", "2020-05-06", "2020-07-04"]], ["PCV13", ["2020-03-05", "2020-05-06", "2020-07-04", "2021-01-08"]]])
    dates.forEach((d, i) => rows.push({ name, date: d, dose: i + 1 }));
  rows.push({ name: "Flu", date: "not a date", dose: null });
  const r = parseIntake(JSON.stringify({ date: null, vaccines: rows }));
  assert.equal(r.vaccines.length, 17);   // more than the old 12 cap
  assert.equal(r.day, null); assert.equal(r.weight, null);
  assert.deepEqual(r.vaccines[2], { name: "乙肝疫苗 HepB", day: "2020-07-04", dose: "第3剂", site: null });
  assert.equal(r.vaccines[16].day, null);
});

test("vaxSeen: same day + same vaccine (ignoring the original name in brackets) is a repeat", () => {
  const had = [{ name: "百白破 DTaP", ts: new Date("2020-03-05T15:30:00").getTime() }];
  assert.equal(vaxSeen(had, "百白破 DTaP（Pediarix）", "2020-03-05"), true);
  assert.equal(vaxSeen(had, "百白破 DTaP", "2020-05-06"), false);
  assert.equal(vaxSeen(had, "乙肝疫苗 HepB", "2020-03-05"), false);
  assert.equal(vaxSeen(had, "百白破 DTaP", null), false);
});

test("normalizers", () => {
  assert.equal(vaxName("乙肝"), "乙肝疫苗 HepB"); assert.equal(vaxName("Hep B"), "乙肝疫苗 HepB"); assert.equal(vaxName("MMR"), "麻腮风 MMR");
  assert.equal(vaxName("Fluoride varnish"), "Fluoride varnish");   // not a vaccine: kept as written, never turned into a flu shot
  assert.equal(vaxName("Beyfortus"), "RSV 单抗 nirsevimab（Beyfortus）");
  assert.equal(vaxDose("2nd"), "第2剂"); assert.equal(vaxDose(9), null); assert.equal(vaxDose("加强"), "加强");
  assert.equal(vaxSite("oral"), "口服"); assert.equal(vaxSite("deltoid, right"), "右上臂"); assert.equal(vaxSite("thigh"), null);
  assert.equal(medCat(null, "Vitamin D drops"), "维生素D"); assert.equal(medCat("probiotic", "x"), "益生菌");
});

test("junk and empty replies", () => {
  assert.equal(parseIntake("not json"), null);
  assert.equal(parseIntake("{}"), null);
  assert.equal(parseIntake(JSON.stringify({ date: "yesterday", vitals: {} })), null);
});
