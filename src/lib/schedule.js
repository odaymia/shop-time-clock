/* Scheduled-shift helpers: HH:MM math, presets, anchoring to a day. */

import { pad2 } from "./time.js";
import { HOUR, REST_MIN_MS, restsEntitled } from "./payroll.js";

/* ---------- schedule helpers ---------- */
export const hhmmToMin = (s) => {
  const [h, m] = String(s || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
export function fmtHHMM(s) {
  const mins = hhmmToMin(s);
  if (mins == null) return "—";
  let h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ap = h >= 12 ? "p" : "a";
  h = h % 12 || 12;
  return m === 0 ? `${h}${ap}` : `${h}:${pad2(m)}${ap}`;
}
/* Minutes a scheduled shift actually pays for. An overnight shift wraps. */
export function shiftMinutes(shift, cfg) {
  if (!shift || !shift.start || !shift.end) return 0;
  const a = hhmmToMin(shift.start);
  let b = hhmmToMin(shift.end);
  if (a == null || b == null) return 0;
  if (b <= a) b += 24 * 60;
  const lunch = cfg?.mealPay === "always" ? 0 : Number(shift.lunch) || 0;
  return Math.max(0, b - a - lunch);
}
export const shiftHours = (shift, cfg) => Math.round((shiftMinutes(shift, cfg) / 60) * 100) / 100;

export const SHIFT_PRESETS = [
  { label: "Open", start: "08:00", end: "16:00", lunch: 30 },
  { label: "Mid", start: "09:00", end: "17:00", lunch: 30 },
  { label: "Close", start: "10:00", end: "18:00", lunch: 30 },
  { label: "Half day", start: "08:00", end: "12:00", lunch: 0 },
];

/* Anchor a scheduled "HH:MM" to a real calendar day so it can be compared
   against punch timestamps. Wraps past midnight for overnight shifts. */
export function schedTs(date, hhmm, wrapPastStart) {
  const mins = hhmmToMin(hhmm);
  if (mins == null) return null;
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  let ts = base.getTime() + mins * 60000;
  if (wrapPastStart != null && ts <= wrapPastStart) ts += 24 * 3600000;
  return ts;
}

/* The punches a scheduled shift implies, for a manager filling in a day
   someone forgot to clock. Lunch goes at the 4-hour mark (or the middle
   of a shorter shift) so it lands before the end of the 5th hour; rest
   breaks are spread evenly through the working blocks on either side of
   it. Only the schedule's own lunch is used — nothing is invented beyond
   what was planned, so a 12-hour shift with one lunch still surfaces a
   second-meal flag for the manager to deal with. */
export function punchesFromShift(shift, date, cfg) {
  const start = schedTs(date, shift?.start);
  const end = schedTs(date, shift?.end, start);
  if (start == null || end == null || end <= start) return [];
  const span = end - start;
  const lunchMs = Math.min((Number(shift.lunch) || 0) * 60000, span);
  const events = [{ type: "in", ts: start }];

  let mealStart = null;
  let mealEnd = null;
  if (lunchMs > 0 && span - lunchMs > HOUR) {
    mealStart = start + Math.min(4 * HOUR, Math.floor((span - lunchMs) / 2));
    mealEnd = mealStart + lunchMs;
    events.push({ type: "mealStart", ts: mealStart }, { type: "mealEnd", ts: mealEnd });
  }

  /* rest breaks are paid and on the clock, so they don't change hours;
     they're recorded so the day doesn't read as "rest breaks not logged" */
  const blocks =
    mealStart != null
      ? [
          [start, mealStart],
          [mealEnd, end],
        ]
      : [[start, end]];
  const workMs = blocks.reduce((a, [s, e]) => a + (e - s), 0);
  let owed = restsEntitled(workMs / HOUR);
  blocks.forEach(([s, e], bi) => {
    const isLast = bi === blocks.length - 1;
    const k = isLast ? owed : Math.round((owed * (e - s)) / workMs);
    for (let i = 1; i <= k; i++) {
      let t = s + Math.round(((e - s) * i) / (k + 1));
      t = Math.round(t / 300000) * 300000; // snap to a 5-minute mark
      t = Math.min(t, e - REST_MIN_MS);
      if (t <= s) continue;
      events.push({ type: "restStart", ts: t }, { type: "restEnd", ts: t + REST_MIN_MS });
    }
    owed -= k;
  });

  events.push({ type: "out", ts: end });
  return events.sort((a, b) => a.ts - b.ts);
}
