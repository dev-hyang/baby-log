import test from "node:test";
import assert from "node:assert/strict";
import { isNight, wakeAdvice } from "../js/sleep-advice.js";

const t = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ""));
const at = (hhmm) => new Date(`2026-11-14T${hhmm}:00`).getTime();

test("night or nap: the record wins, otherwise the start hour", () => {
  assert.equal(isNight(at("20:30")), true); assert.equal(isNight(at("02:00")), true); assert.equal(isNight(at("13:00")), false);
  assert.equal(isNight(at("20:30"), true), false); assert.equal(isNight(at("13:00"), false), true);
});

test("naps: capped by age, and not too late in the day", () => {
  const a = wakeAdvice({ start: at("12:30"), now: at("13:30"), months: 18 }, t);
  assert.equal(a.level, "ok"); assert.match(a.text, /15:00/);                  // 1–3 y: 2.5 h
  assert.equal(wakeAdvice({ start: at("12:30"), now: at("14:45"), months: 18 }, t).level, "soon");
  assert.equal(wakeAdvice({ start: at("12:30"), now: at("15:05"), months: 18 }, t).level, "wake");
  const late = wakeAdvice({ start: at("15:00"), now: at("16:10"), months: 18 }, t);   // 16:00 comes before the cap
  assert.equal(late.level, "wake"); assert.match(late.text, /傍晚/);
  assert.equal(wakeAdvice({ start: at("13:00"), now: at("14:40"), months: 48 }, t).level, "wake");   // 3 y+: 1.5 h
});

test("night: never wake, except a gentle nudge in the morning once slept enough", () => {
  assert.equal(wakeAdvice({ start: at("02:00"), now: at("05:00"), months: 30 }, t).level, "ok");
  assert.equal(wakeAdvice({ start: new Date("2026-11-13T19:30:00").getTime(), now: at("06:30"), months: 30 }, t).level, "soon");
  assert.equal(wakeAdvice({ start: new Date("2026-11-13T22:30:00").getTime(), now: at("06:30"), months: 30 }, t).level, "ok");   // only 8 h
});

test("newborns: counted from the last feed", () => {
  const a = wakeAdvice({ start: at("10:00"), now: at("12:30"), months: 0, lastFeed: at("09:30") }, t);
  assert.equal(a.level, "wake"); assert.match(a.text, /3 小时/);
  assert.equal(wakeAdvice({ start: at("23:00"), now: at("02:00"), months: 0, lastFeed: at("22:40") }, t).level, "ok");   // night: 4 h
});
