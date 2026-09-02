/* Payroll and California break rules. Pure functions, no UI.
   Punches are an append-only event log; shifts are derived from it here,
   never stored. See "Payroll rules that must not be simplified" in
   CLAUDE.md before changing anything in this file. */

import { addDays, dayKey, decHours, roundTs, startOfWeek } from "./time.js";

/* A lunch is paid when the shop always pays, or when a manager marked
   that particular one. Either way it stays a real off-duty 30 minutes. */
export const mealIsPaid = (meal, cfg) =>
  cfg.mealPay === "always" || (cfg.mealPay === "discretionary" && !!meal.paid);

/* ---------- shift building ---------- */
/* California treats the two break types completely differently:
   a rest period is 10 minutes, paid, on the clock; a meal period is
   30 minutes, unpaid, off duty. They can never share one bucket. */
export const MEAL_START = ["mealStart", "breakStart"]; // breakStart = pre-split records
export const MEAL_END = ["mealEnd", "breakEnd"];

export function buildSessions(events, cfg) {
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  const out = [];
  let cur = null;
  const closeMeal = (s, ts) => {
    if (s && s.openMeal != null) {
      s.meals.push({ start: s.openMeal, end: ts, paid: !!s.openMealPaid, id: s.openMealId });
      s.openMeal = null;
      s.openMealPaid = false;
      s.openMealId = null;
    }
  };
  const closeRest = (s, ts) => {
    if (s && s.openRest != null) {
      s.rests.push({ start: s.openRest, end: ts });
      s.openRest = null;
    }
  };
  for (const e of sorted) {
    const ts = roundTs(e.ts, cfg.roundingMin);
    if (e.type === "in") {
      if (cur) {
        closeMeal(cur, ts);
        closeRest(cur, ts);
        cur.end = null;
        cur.missingOut = true;
        out.push(cur);
      }
      cur = {
        id: e.id,
        start: ts,
        end: null,
        meals: [],
        rests: [],
        openMeal: null,
        openRest: null,
        openMealPaid: false,
        openMealId: null,
        missingOut: false,
      };
    } else if (MEAL_START.includes(e.type)) {
      if (cur && cur.openMeal == null) {
        closeRest(cur, ts);
        cur.openMeal = ts;
        cur.openMealPaid = !!e.paidMeal;
        cur.openMealId = e.id;
      }
    } else if (MEAL_END.includes(e.type)) {
      closeMeal(cur, ts);
    } else if (e.type === "restStart") {
      if (cur && cur.openRest == null && cur.openMeal == null) cur.openRest = ts;
    } else if (e.type === "restEnd") {
      closeRest(cur, ts);
    } else if (e.type === "out") {
      if (cur) {
        closeMeal(cur, ts);
        closeRest(cur, ts);
        cur.end = ts;
        out.push(cur);
        cur = null;
      }
    }
  }
  if (cur) {
    cur.open = true;
    out.push(cur);
  }
  return out;
}

/* Paid time = everything on the clock, minus the lunches the shop isn't
   paying for. Rest periods are always paid, so they're never subtracted. */
export function sessionWorkedMs(s, cfg, nowMs) {
  const end = s.end != null ? s.end : s.missingOut ? s.start : nowMs;
  let ms = end - s.start;
  for (const m of s.meals) if (!mealIsPaid(m, cfg)) ms -= m.end - m.start;
  if (s.openMeal != null && !mealIsPaid({ paid: s.openMealPaid }, cfg)) {
    ms -= (s.end != null ? s.end : nowMs) - s.openMeal;
  }
  return Math.max(0, ms);
}
/* Lunch minutes the shop gave away, for cost visibility. */
export function sessionPaidMealMs(s, cfg) {
  return s.meals.reduce((a, m) => a + (mealIsPaid(m, cfg) ? m.end - m.start : 0), 0);
}
export function sessionMealMs(s, nowMs) {
  let ms = 0;
  for (const m of s.meals) ms += m.end - m.start;
  if (s.openMeal != null) ms += nowMs - s.openMeal;
  return ms;
}
export function sessionRestMs(s, nowMs) {
  let ms = 0;
  for (const r of s.rests) ms += r.end - r.start;
  if (s.openRest != null) ms += nowMs - s.openRest;
  return ms;
}
/* kept so older call sites keep working */
export function sessionBreakMs(s, nowMs) {
  return sessionMealMs(s, nowMs) + sessionRestMs(s, nowMs);
}

/* ---------- California break rules ---------- */
export const MEAL_MIN_MS = 30 * 60000;
export const REST_MIN_MS = 10 * 60000;
export const HOUR = 3600000;

/* Rest periods: one per four hours "or major fraction thereof."
   The DLSE reads that as the bands below, not as a rounding formula. */
export function restsEntitled(hours) {
  if (hours < 3.5) return 0;
  if (hours <= 6) return 1;
  if (hours <= 10) return 2;
  if (hours <= 14) return 3;
  return 4;
}

/* Evaluates one worked day against Labor Code 512 and the wage order.
   Returns what was owed, what happened, and what premium that triggers. */
export function breakCompliance(sessions, cfg, nowMs, attestation, emp) {
  const workedMs = sessions.reduce((a, s) => a + sessionWorkedMs(s, cfg, nowMs), 0);
  const hours = workedMs / HOUR;
  const meals = sessions.flatMap((s) => s.meals).sort((a, b) => a.start - b.start);
  const rests = sessions.flatMap((s) => s.rests);
  const shiftStart = sessions.length ? Math.min(...sessions.map((s) => s.start)) : null;
  const closed = sessions.length > 0 && sessions.every((s) => s.end != null);

  const res = {
    hours,
    shiftStart,
    meals,
    paidMealMs: sessions.reduce((a, s) => a + sessionPaidMealMs(s, cfg), 0),
    restsTaken: rests.filter((r) => r.end - r.start >= REST_MIN_MS - 30000).length,
    restsLogged: rests.length,
    issues: [],
    mealPremium: 0,
    restPremium: 0,
    meal1: null,
    meal2: null,
    restsOwed: restsEntitled(hours),
  };
  if (!sessions.length || shiftStart == null) return res;

  const waived1 = attestation?.meal1 === "waived";
  const waived2 = attestation?.meal2 === "waived";
  const denied = (k) => attestation?.[k] === "denied";

  /* ---- first meal: must begin before the end of the 5th hour ---- */
  if (hours > 5) {
    const deadline = shiftStart + 5 * HOUR;
    const m = meals[0] || null;
    const dur = m ? m.end - m.start : 0;
    const canWaive = hours <= 6;
    const info = {
      required: true,
      deadline,
      taken: !!m,
      start: m ? m.start : null,
      minutes: m ? Math.round(dur / 60000) : 0,
      late: m ? m.start > deadline : false,
      short: m ? dur < MEAL_MIN_MS - 30000 : false,
      canWaive,
      waived: waived1 && canWaive,
    };
    info.ok = info.waived || (info.taken && !info.late && !info.short);
    res.meal1 = info;

    if (!info.ok && closed) {
      if (!info.taken) res.issues.push(canWaive ? "No lunch taken" : "Lunch missed");
      else if (info.short) res.issues.push(`Lunch was only ${info.minutes} min`);
      else if (info.late) res.issues.push(`Lunch started after the 5th hour`);
      if (!waived1) res.mealPremium = 1;
    }
  }

  /* ---- second meal: before the end of the 10th hour ---- */
  if (hours > 10) {
    /* A paid lunch is time worked, so it doesn't push the deadline out.
       An unpaid one does, because those minutes aren't hours worked. */
    const first = meals[0];
    const firstDur = first ? first.end - first.start : 0;
    const deadline =
      shiftStart + 10 * HOUR + (first && mealIsPaid(first, cfg) ? 0 : firstDur);
    const m = meals[1] || null;
    const dur = m ? m.end - m.start : 0;
    const canWaive = hours <= 12 && !waived1;
    const info = {
      required: true,
      deadline,
      taken: !!m,
      start: m ? m.start : null,
      minutes: m ? Math.round(dur / 60000) : 0,
      late: m ? m.start > deadline : false,
      short: m ? dur < MEAL_MIN_MS - 30000 : false,
      canWaive,
      waived: waived2 && canWaive,
    };
    info.ok = info.waived || (info.taken && !info.late && !info.short);
    res.meal2 = info;
    if (!info.ok && closed && !waived2) {
      res.issues.push("Second lunch missed on a shift over 10 hours");
      res.mealPremium = 1; // statute caps meal premiums at one per day
    }
  }

  /* ---- rest periods ---- */
  if (res.restsOwed > res.restsTaken && closed) {
    res.issues.push(
      `${res.restsOwed - res.restsTaken} rest break${
        res.restsOwed - res.restsTaken > 1 ? "s" : ""
      } not logged`
    );
    if (attestation?.rest !== "taken") res.restPremium = 1;
  }

  /* An employee saying they were prevented is the thing that decides
     whether a premium is owed — a waiver only counts if it was free. */
  if (denied("meal1") || denied("meal2")) res.mealPremium = 1;
  if (denied("rest")) res.restPremium = 1;

  return res;
}

/* What the person on the clock owes next, for live prompts. */
export function nextBreakDue(session, cfg, nowMs) {
  if (!session || session.end != null) return null;
  const workedMs = sessionWorkedMs(session, cfg, nowMs);
  const meals = session.meals;
  if (session.openMeal != null) {
    const elapsed = nowMs - session.openMeal;
    return {
      kind: "onMeal",
      dueAt: session.openMeal + MEAL_MIN_MS,
      remaining: MEAL_MIN_MS - elapsed,
      label: "On lunch",
    };
  }
  if (session.openRest != null) {
    const elapsed = nowMs - session.openRest;
    return {
      kind: "onRest",
      dueAt: session.openRest + REST_MIN_MS,
      remaining: REST_MIN_MS - elapsed,
      label: "On rest break",
    };
  }
  const goodMeals = meals.filter((m) => m.end - m.start >= MEAL_MIN_MS - 30000);
  if (goodMeals.length === 0) {
    const deadline = session.start + 5 * HOUR;
    if (workedMs > 3.5 * HOUR || nowMs > deadline - 90 * 60000) {
      return {
        kind: "meal1",
        dueAt: deadline,
        remaining: deadline - nowMs,
        label: "Lunch due",
      };
    }
  } else if (workedMs > 10 * HOUR && goodMeals.length < 2) {
    const firstDur = meals[0].end - meals[0].start;
    const deadline = session.start + 10 * HOUR + firstDur;
    return {
      kind: "meal2",
      dueAt: deadline,
      remaining: deadline - nowMs,
      label: "Second lunch due",
    };
  }
  return null;
}

/* ---------- overtime ---------- */
export function splitDay(hrs, rules) {
  if (rules !== "ca") return { reg: hrs, ot: 0, dt: 0 };
  const reg = Math.min(hrs, 8);
  const ot = Math.max(0, Math.min(hrs, 12) - 8);
  const dt = Math.max(0, hrs - 12);
  return { reg, ot, dt };
}
export function weekTotals(dayHourList, rules) {
  let reg = 0,
    ot = 0,
    dt = 0;
  for (const h of dayHourList) {
    const s = splitDay(h, rules);
    reg += s.reg;
    ot += s.ot;
    dt += s.dt;
  }
  if (reg > 40) {
    ot += reg - 40;
    reg = 40;
  }
  const r = (n) => Math.round(n * 100) / 100;
  return { reg: r(reg), ot: r(ot), dt: r(dt), total: r(reg + ot + dt) };
}

/* ---------- pay period ---------- */
export function periodEnd(cfg, periodStartDate) {
  return addDays(periodStartDate, 6);
}
export function isLastDayOfPeriod(cfg, d) {
  return dayKey(d) === dayKey(periodEnd(cfg, startOfWeek(d, cfg.weekStart)));
}

/* One place that turns raw punches into the numbers a person signs for.
   The review screen and the manager timecard both call this, so what the
   employee agrees to is exactly what shows up on the payroll export. */
export function periodSummary(events, cfg, periodStartDate, nowMs) {
  const wStart = periodStartDate.getTime();
  const wEnd = addDays(periodStartDate, 7).getTime();
  const sessions = buildSessions(
    [...events].sort((a, b) => a.ts - b.ts),
    cfg
  ).filter((s) => s.start >= wStart && s.start < wEnd);

  const days = Array.from({ length: 7 }, (_, i) => addDays(periodStartDate, i));
  const rows = days.map((d) => {
    const k = dayKey(d);
    const mine = sessions.filter((s) => dayKey(new Date(s.start)) === k);
    const ms = mine.reduce((a, s) => a + sessionWorkedMs(s, cfg, nowMs), 0);
    const breakMs = mine.reduce((a, s) => a + sessionBreakMs(s, nowMs), 0);
    const mealMs = mine.reduce((a, s) => a + sessionMealMs(s, nowMs), 0);
    const paidMealMs = mine.reduce((a, s) => a + sessionPaidMealMs(s, cfg), 0);
    const restCount = mine.reduce((a, s) => a + s.rests.length, 0);
    return {
      date: d,
      ms,
      breakMs,
      mealMs,
      paidMealMs,
      restCount,
      sessions: mine,
      hours: decHours(ms),
    };
  });
  const totals = weekTotals(rows.map((r) => r.hours), cfg.otRules);
  const openShift = sessions.some((s) => s.open || s.missingOut);
  return { days, rows, totals, sessions, openShift };
}
