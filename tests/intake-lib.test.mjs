import test from "node:test";
import assert from "node:assert/strict";
import { extraParts, medCat, placeText, mergeInto, parseIntake, sameEntry, sameVisit, vaxDose, vaxName, vaxSeen, vaxSite } from "../js/intake-lib.js";

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

test("age 2+ checkup: BMI, blood pressure, pulse and percentiles; impossible ones dropped", () => {
  const r = parseIntake(JSON.stringify({ kind: "checkup", vitals: { weight_kg: 16, length_cm: 100, bmi: 16.04, bp_systolic: 98, bp_diastolic: 60, pulse: 102, weight_pct: 62, length_pct: "75", head_pct: 0, bmi_pct: 140 } }));
  assert.equal(r.bmi, 16); assert.equal(r.bp_sys, 98); assert.equal(r.bp_dia, 60); assert.equal(r.pulse, 102);
  assert.equal(r.wpct, 62); assert.equal(r.lpct, 75); assert.equal(r.headpct, null); assert.equal(r.bmipct, null);
  assert.deepEqual(extraParts(r), [["BMI", "16"], ["血压", "98/60"], ["心率", "102"], ["体重", "P62"], ["身高", "P75"]]);
  assert.ok(parseIntake(JSON.stringify({ vitals: { bp_systolic: 100, bp_diastolic: 65 } })));   // vitals-only sheet still counts
});

test("re-scan: same-day visit and same items are found; merge keeps old values and the old note", () => {
  const day = ts => new Date(ts + "T10:00:00").getTime();
  const had = [{ id: "a", type: "baby", src: "儿科体检", ts: day("2026-10-20"), weight: 16, note: "Growing well." }, { id: "b", type: "baby", src: "自己记录", ts: day("2026-10-21"), weight: 16.1 }];
  assert.equal(sameVisit(had, "2026-10-20").id, "a"); assert.equal(sameVisit(had, "2026-10-21"), null);
  const m = mergeInto(had[0], { weight: 16.2, bmi: 16, note: "Growing well. BP normal." });
  assert.equal(m.weight, 16.2); assert.equal(m.bmi, 16); assert.equal(m.note, "Growing well. BP normal."); assert.equal(m.id, "a");
  assert.equal(mergeInto({ note: "Mom: slept late" }, { note: "Healthy" }).note, "Mom: slept late\nHealthy");
  assert.equal(mergeInto({ note: "Healthy, keep vitamin D" }, { note: "Healthy" }).note, "Healthy, keep vitamin D");
  assert.equal(mergeInto({ dose: "第1剂" }, { dose: "", site: null }).dose, "第1剂");
  assert.equal(sameEntry([{ name: "Pulls to stand", ts: day("2025-01-01") }], "pulls to stand", null).name, "Pulls to stand");
});

test("hospital and doctor are two fields; old records with one combined field still show", () => {
  const r = parseIntake(JSON.stringify({ kind: "checkup", clinic: "Sunny Pediatrics", doctor: "Dr. Lee", vitals: { weight_kg: 16 } }));
  assert.equal(r.clinic, "Sunny Pediatrics"); assert.equal(r.doctor, "Dr. Lee");
  assert.equal(placeText(r), "Sunny Pediatrics · Dr. Lee");
  assert.equal(placeText({ clinic: "协和医院 王医生" }), "协和医院 王医生"); assert.equal(placeText({ doctor: " Dr. Lee " }), "Dr. Lee"); assert.equal(placeText({}), "");
});

test("tables: one row per date for measurements, every lab row with its range", () => {
  const r = parseIntake(JSON.stringify({ rows: [
    { date: "2024-06-14", kind: "checkup", vitals: { weight_kg: 14.1, length_cm: 96 } },
    { date: "2025-06-11", vitals: { weight_lb: 35.3, bmi: 14.8, weight_pct: 60 } },
    { date: "2025-06-11", vitals: { length_cm: 104 } },
    { date: "sometime", vitals: { weight_kg: 12 } }, { date: "2023-01-01", vitals: {} }],
    labs: [{ date: "2026-10-20", name: "Hemoglobin", value: "11.8", unit: "g/dL", ref_low: 11.5, ref_high: "15.5" }, { name: "Lead", value: "<3.3", unit: "ug/dL", ref_high: 3.5 }, { name: "Note only", value: "normal" }] }));
  assert.equal(r.rows.length, 2);
  assert.deepEqual([r.rows[0].day, r.rows[0].src, r.rows[0].weight, r.rows[0].length], ["2024-06-14", "儿科体检", 14.1, 96]);
  assert.deepEqual([r.rows[1].weight, r.rows[1].length, r.rows[1].bmi, r.rows[1].wpct], [16.012, 104, 14.8, 60]);
  assert.equal(r.labs.length, 2);
  assert.deepEqual(r.labs[0], { day: "2026-10-20", name: "Hemoglobin", value: 11.8, unit: "g/dL", lo: 11.5, hi: 15.5 });
  assert.deepEqual([r.labs[1].day, r.labs[1].value, r.labs[1].lo, r.labs[1].hi], [null, 3.3, null, 3.5]);
  assert.equal(r.weight, null);   // a history table does not invent "this visit"
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
