import { useState, useEffect } from "react";
import { BreakDetailModal } from "./BreakDetailModal.jsx";
import { CsvModal } from "./CsvModal.jsx";
import { PunchEditor } from "./PunchEditor.jsx";
import { PunchList } from "./PunchList.jsx";
import { SignatureModal } from "./SignatureModal.jsx";
import { VarianceModal } from "./VarianceModal.jsx";
import { attestKeyFor, schedKeyFor } from "../../lib/keys.js";
import { breakCompliance, buildSessions, mealIsPaid, sessionBreakMs, sessionMealMs, sessionPaidMealMs, sessionWorkedMs, splitDay, weekTotals } from "../../lib/payroll.js";
import { uid } from "../../lib/ids.js";
import { punchesFromShift, schedTs, shiftHours } from "../../lib/schedule.js";
import { addDays, dayKey, decHours, fmtDateShort, fmtTime, startOfWeek, ym } from "../../lib/time.js";
import { sGet } from "../../storage/index.js";
import { useStorageVersion } from "../../hooks/useCloud.js";

/* ---------- timecards ---------- */
export function Timecards({ cfg, employees, months, loadMonth, updateEvents, now, flash }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [openEmp, setOpenEmp] = useState(null);
  const [csv, setCsv] = useState(null);
  const [editing, setEditing] = useState(null);
  const [attest, setAttest] = useState({});
  const [viewSign, setViewSign] = useState(null);
  const [breakDetail, setBreakDetail] = useState(null);
  const [view, setView] = useState("hours"); // hours | variance
  const [sched, setSched] = useState(null);
  const [varDetail, setVarDetail] = useState(null);
  const version = useStorageVersion();

  const weekStartDate = addDays(startOfWeek(new Date(), cfg.weekStart), weekOffset * 7);
  const weekEndDate = addDays(weekStartDate, 6);
  const wStart = weekStartDate.getTime();
  const wEnd = addDays(weekStartDate, 7).getTime();

  useEffect(() => {
    loadMonth(ym(weekStartDate));
    loadMonth(ym(weekEndDate));
  }, [weekOffset, version]); // eslint-disable-line

  useEffect(() => {
    let dead = false;
    (async () => {
      const s = await sGet(schedKeyFor(dayKey(weekStartDate)), null);
      if (!dead) setSched(s);
    })();
    return () => {
      dead = true;
    };
  }, [weekOffset, version]); // eslint-disable-line

  useEffect(() => {
    let dead = false;
    (async () => {
      const pStart = dayKey(weekStartDate);
      const found = {};
      for (const e of employees) {
        const rec = await sGet(attestKeyFor(pStart, e.id), null);
        if (rec) found[e.id] = rec;
      }
      if (!dead) setAttest(found);
    })();
    return () => {
      dead = true;
    };
  }, [weekOffset, employees, version]); // eslint-disable-line

  const all = Object.values(months).flat();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  const rowFor = (emp) => {
    const evs = all.filter((e) => e.empId === emp.id).sort((a, b) => a.ts - b.ts);
    const attests = evs.filter((e) => e.type === "breakAttest");
    const sessions = buildSessions(evs, cfg).filter((s) => s.start >= wStart && s.start < wEnd);
    const byDay = {};
    for (const s of sessions) {
      const k = dayKey(new Date(s.start));
      byDay[k] = byDay[k] || { ms: 0, breakMs: 0, sessions: [] };
      byDay[k].ms += sessionWorkedMs(s, cfg, now);
      byDay[k].breakMs += sessionBreakMs(s, now);
      byDay[k].sessions.push(s);
    }
    const dayHours = days.map((d) => decHours(byDay[dayKey(d)]?.ms || 0));
    const totals = weekTotals(dayHours, cfg.otRules);
    const paidMealMs = sessions.reduce((a, s) => a + sessionPaidMealMs(s, cfg), 0);
    const paidMealCount = sessions.reduce(
      (a, s) => a + s.meals.filter((m) => mealIsPaid(m, cfg)).length,
      0
    );

    let mealPrem = 0,
      restPrem = 0;
    const flags = [];
    if (cfg.breakRules) {
      for (const d of days) {
        const k = dayKey(d);
        const info = byDay[k];
        if (!info) continue;
        const att = attests.find((a) => a.payload?.day === k)?.payload || null;
        const comp = breakCompliance(info.sessions, cfg, now, att, emp);
        info.comp = comp;
        info.attested = !!att;
        mealPrem += comp.mealPremium;
        restPrem += comp.restPremium;
        if (comp.issues.length) flags.push({ day: k, date: d, comp, att });
      }
    }

    const anomalies = sessions.filter((s) => s.missingOut).length;

    /* --- scheduled vs actual --- */
    const grace = (cfg.graceMin || 0) * 60000;
    const mine = sched?.shifts?.[emp.id] || {};
    const variance = days.map((d, i) => {
      const k = dayKey(d);
      const shift = mine[k];
      const schedH = shiftHours(shift, cfg);
      const actualH = dayHours[i];
      const info = byDay[k];
      const row = {
        date: d,
        day: k,
        shift,
        schedH,
        actualH,
        diff: Math.round((actualH - schedH) * 100) / 100,
        notes: [],
        kind: null,
      };
      if (shift && actualH === 0) {
        row.notes.push("Scheduled but never clocked in");
        row.kind = "noshow";
      } else if (!shift && actualH > 0) {
        row.notes.push("Worked without being on the schedule");
        row.kind = "unscheduled";
      } else if (shift && info) {
        const firstIn = Math.min(...info.sessions.map((s) => s.start));
        const lastOut = Math.max(
          ...info.sessions.map((s) => (s.end != null ? s.end : s.start))
        );
        const sStart = schedTs(d, shift.start);
        const sEnd = schedTs(d, shift.end, sStart);
        if (sStart && firstIn > sStart + grace)
          row.notes.push(`In ${Math.round((firstIn - sStart) / 60000)} min late`);
        if (sStart && firstIn < sStart - grace)
          row.notes.push(`In ${Math.round((sStart - firstIn) / 60000)} min early`);
        if (sEnd && lastOut > sEnd + grace)
          row.notes.push(`Stayed ${Math.round((lastOut - sEnd) / 60000)} min past the end`);
        if (sEnd && lastOut < sEnd - grace)
          row.notes.push(`Left ${Math.round((sEnd - lastOut) / 60000)} min early`);
        if (row.notes.length) row.kind = row.diff > 0 ? "over" : "under";
      }
      return row;
    });
    const schedTotal = Math.round(variance.reduce((a, v) => a + v.schedH, 0) * 100) / 100;
    const varTotal = Math.round((totals.total - schedTotal) * 100) / 100;

    return {
      byDay,
      dayHours,
      totals,
      anomalies,
      sessions,
      mealPrem,
      restPrem,
      flags,
      paidMealMs,
      paidMealCount,
      variance,
      schedTotal,
      varTotal,
    };
  };

  const rows = employees.map((e) => ({ emp: e, ...rowFor(e) }));
  const buildCsv = () => {
    const lines = [
      [
        "Employee",
        "Date",
        "Clock in",
        "Clock out",
        "Lunch (min)",
        "Lunch paid",
        "Rest breaks",
        "Hours",
        "Scheduled",
        "Variance",
        "Regular",
        "OT",
        "Double",
        "Meal premium",
        "Rest premium",
        "Break note",
      ].join(","),
    ];
    for (const r of rows) {
      days.forEach((d, i) => {
        const k = dayKey(d);
        const info = r.byDay[k];
        if (!info) return;
        const split = splitDay(r.dayHours[i], cfg.otRules);
        const comp = info.comp;
        info.sessions.forEach((s, si) => {
          lines.push(
            [
              `"${r.emp.name}"`,
              k,
              fmtTime(new Date(s.start)),
              s.end ? fmtTime(new Date(s.end)) : s.missingOut ? "MISSING" : "still in",
              Math.round(sessionMealMs(s, now) / 60000),
              s.meals.some((m) => mealIsPaid(m, cfg))
                ? "paid"
                : s.meals.length
                ? "unpaid"
                : "",
              s.rests.length,
              si === 0 ? r.dayHours[i] : "",
              si === 0 ? r.variance[i].schedH.toFixed(2) : "",
              si === 0 ? r.variance[i].diff.toFixed(2) : "",
              si === 0 ? split.reg.toFixed(2) : "",
              si === 0 ? split.ot.toFixed(2) : "",
              si === 0 ? split.dt.toFixed(2) : "",
              si === 0 && comp ? comp.mealPremium : "",
              si === 0 && comp ? comp.restPremium : "",
              si === 0 && comp && comp.issues.length ? `"${comp.issues.join("; ")}"` : "",
            ].join(",")
          );
        });
      });
      lines.push(
        [
          `"${r.emp.name}"`,
          "WEEK TOTAL",
          "",
          "",
          "",
          "",
          "",
          r.totals.total,
          r.schedTotal.toFixed(2),
          r.varTotal.toFixed(2),
          r.totals.reg,
          r.totals.ot,
          r.totals.dt,
          r.mealPrem,
          r.restPrem,
          "",
        ].join(",")
      );
    }
    setCsv(lines.join("\n"));
  };

  /* A manager filling in a day someone was scheduled but never clocked.
     Every punch is tagged "from schedule" — these are the manager's word,
     not the employee's, and the punch list says so. */
  const fillFromSchedule = async (emp, v) => {
    const list = punchesFromShift(v.shift, v.date, cfg);
    if (!list.length) return flash("That shift has no usable times", "out");
    const filledAt = Date.now();
    const byMonth = {};
    for (const p of list) {
      const ev = {
        id: uid(),
        empId: emp.id,
        type: p.type,
        ts: p.ts,
        filled: true,
        payload: { source: "schedule", filledAt },
      };
      (byMonth[ym(new Date(p.ts))] ||= []).push(ev);
    }
    for (const [key, evs] of Object.entries(byMonth)) {
      await updateEvents(key, [...(months[key] || []), ...evs]);
    }
    setVarDetail(null);
    flash(`${emp.name} clocked in from the schedule for ${fmtDateShort(v.date)}`);
  };

  const togglePaidMeal = async (ev) => {
    const key = ym(new Date(ev.ts));
    const list = (months[key] || []).map((x) =>
      x.id === ev.id ? { ...x, paidMeal: !x.paidMeal } : x
    );
    await updateEvents(key, list);
    flash(ev.paidMeal ? "Lunch set back to unpaid" : "Lunch is on the shop — 30 min added");
  };

  const deleteEvent = async (ev) => {
    const key = ym(new Date(ev.ts));
    const list = (months[key] || []).filter((x) => x.id !== ev.id);
    await updateEvents(key, list);
    flash("Punch deleted");
  };

  return (
    <div className="pane">
      <div className="weekNav">
        <button className="btn ghost" onClick={() => setWeekOffset((w) => w - 1)}>
          ‹ Previous
        </button>
        <div className="weekLabel">
          <strong>
            {weekStartDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
            {weekEndDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </strong>
          <span>{weekOffset === 0 ? "This week" : `${Math.abs(weekOffset)} week(s) back`}</span>
        </div>
        <button
          className="btn ghost"
          onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
          disabled={weekOffset >= 0}
        >
          Next ›
        </button>
        <button className="btn primary" onClick={buildCsv}>
          Export for payroll
        </button>
      </div>

      <div className="viewToggle">
        <button
          className={`mgrTab ${view === "hours" ? "on" : ""}`}
          onClick={() => setView("hours")}
        >
          Hours worked
        </button>
        <button
          className={`mgrTab ${view === "variance" ? "on" : ""}`}
          onClick={() => setView("variance")}
        >
          Against the schedule
        </button>
      </div>

      {employees.length === 0 ? (
        <p className="muted pad">Add people to the roster and their hours will show up here.</p>
      ) : view === "variance" ? (
        !sched || !sched.shifts || Object.keys(sched.shifts).length === 0 ? (
          <div className="schedEmpty">
            <p>No schedule built for this week.</p>
            <span>Build one in the Schedule tab and the comparison shows up here.</span>
          </div>
        ) : (
          <>
            <div className="tableWrap">
              <table className="tc">
                <thead>
                  <tr>
                    <th className="stick">Name</th>
                    {days.map((d) => (
                      <th key={d.toISOString()}>{fmtDateShort(d)}</th>
                    ))}
                    <th>Sched</th>
                    <th>Worked</th>
                    <th>Diff</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.emp.id}>
                      <td className="stick nameCell">{r.emp.name}</td>
                      {r.variance.map((v) => (
                        <td key={v.day} className={`varCell ${v.kind || ""}`}>
                          {v.schedH === 0 && v.actualH === 0 ? (
                            <span className="zero">—</span>
                          ) : (
                            <>
                              <span className="varNum">
                                {v.diff > 0 ? "+" : ""}
                                {v.diff.toFixed(2)}
                              </span>
                              <em>
                                {v.schedH.toFixed(1)}→{v.actualH.toFixed(1)}
                              </em>
                            </>
                          )}
                        </td>
                      ))}
                      <td className="num">{r.schedTotal.toFixed(2)}</td>
                      <td className="num">{r.totals.total.toFixed(2)}</td>
                      <td className={`num tot ${r.varTotal > 0 ? "ot" : ""}`}>
                        {r.varTotal > 0 ? "+" : ""}
                        {r.varTotal.toFixed(2)}
                      </td>
                      <td>
                        <button className="btn tiny" onClick={() => setVarDetail(r)}>
                          Why
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(() => {
              const s = rows.reduce((a, r) => a + r.schedTotal, 0);
              const w = rows.reduce((a, r) => a + r.totals.total, 0);
              const d = w - s;
              const cost = rows.reduce((a, r) => {
                const rate = parseFloat(r.emp.rate);
                return a + (isFinite(rate) ? r.varTotal * rate : 0);
              }, 0);
              return (
                <p className={`varSummary ${d > 0 ? "over" : d < 0 ? "under" : ""}`}>
                  Planned {s.toFixed(1)} hours, paid for {w.toFixed(1)}.{" "}
                  {Math.abs(d) < 0.05
                    ? "Right on plan."
                    : d > 0
                    ? `You're ${d.toFixed(1)} hours over${
                        cost > 0 ? `, roughly $${Math.abs(cost).toFixed(0)} at base rates` : ""
                      }.`
                    : `You're ${Math.abs(d).toFixed(1)} hours under plan.`}
                </p>
              );
            })()}
          </>
        )
      ) : (
        <div className="tableWrap">
          <table className="tc">
            <thead>
              <tr>
                <th className="stick">Name</th>
                {days.map((d) => (
                  <th key={d.toISOString()}>{fmtDateShort(d)}</th>
                ))}
                <th>Reg</th>
                <th>OT</th>
                <th>2x</th>
                <th>Total</th>
                <th>Premium</th>
                <th>Signed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.emp.id}>
                  <td className="stick nameCell">
                    {r.emp.name}
                    {r.anomalies > 0 && <span className="warnDot" title="Missing clock-out" />}
                  </td>
                  {r.dayHours.map((h, i) => (
                    <td key={i} className={h > 8 ? "hot" : h > 0 ? "" : "zero"}>
                      {h > 0 ? h.toFixed(2) : "—"}
                    </td>
                  ))}
                  <td className="num">{r.totals.reg.toFixed(2)}</td>
                  <td className="num ot">{r.totals.ot > 0 ? r.totals.ot.toFixed(2) : "—"}</td>
                  <td className="num ot">{r.totals.dt > 0 ? r.totals.dt.toFixed(2) : "—"}</td>
                  <td className="num tot">{r.totals.total.toFixed(2)}</td>
                  <td>
                    {r.mealPrem + r.restPrem > 0 ? (
                      <button className="sigTag bad" onClick={() => setBreakDetail(r)}>
                        {r.mealPrem + r.restPrem} hr
                      </button>
                    ) : r.flags.length > 0 ? (
                      <button className="sigTag warnEdit" onClick={() => setBreakDetail(r)}>
                        Waived
                      </button>
                    ) : (
                      <span className="sigTag none">—</span>
                    )}
                  </td>
                  <td>
                    {(() => {
                      const a = attest[r.emp.id];
                      if (!a) return <span className="sigTag none">Not yet</span>;
                      if (!a.agreed)
                        return (
                          <button className="sigTag bad" onClick={() => setViewSign(a)}>
                            Disputed
                          </button>
                        );
                      const drift =
                        Math.abs((a.totals?.total || 0) - r.totals.total) > 0.01;
                      return (
                        <button
                          className={`sigTag ${drift ? "warnEdit" : "ok"}`}
                          onClick={() => setViewSign(a)}
                        >
                          {drift ? "Signed, changed" : "Signed"}
                        </button>
                      );
                    })()}
                  </td>
                  <td>
                    <button
                      className="btn tiny"
                      onClick={() => setOpenEmp(openEmp === r.emp.id ? null : r.emp.id)}
                    >
                      {openEmp === r.emp.id ? "Hide" : "Punches"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cfg.mealPay !== "unpaid" &&
        (() => {
          const count = rows.reduce((a, r) => a + r.paidMealCount, 0);
          if (!count) return null;
          const hrs = rows.reduce((a, r) => a + r.paidMealMs, 0) / 3600000;
          const cost = rows.reduce((a, r) => {
            const rate = parseFloat(r.emp.rate);
            return a + (isFinite(rate) ? (r.paidMealMs / 3600000) * rate : 0);
          }, 0);
          return (
            <p className="paidSummary">
              You covered {count} lunch{count === 1 ? "" : "es"} this week — {hrs.toFixed(1)} paid
              hours
              {cost > 0 ? `, about $${cost.toFixed(0)} at their base rates` : ""}.
            </p>
          );
        })()}

      {openEmp && (
        <PunchList
          emp={employees.find((e) => e.id === openEmp)}
          events={Object.values(months)
            .flat()
            .filter((e) => e.empId === openEmp && e.ts >= wStart && e.ts < wEnd)
            .sort((a, b) => a.ts - b.ts)}
          onEdit={(ev) => setEditing(ev)}
          onDelete={deleteEvent}
          onTogglePaid={togglePaidMeal}
          cfg={cfg}
          onAdd={() => setEditing({ empId: openEmp, type: "in", ts: Date.now(), isNew: true })}
        />
      )}

      <p className="legalNote">
        Overtime is figured on California rules: over 8 hours in a day at 1.5×, over 12 at 2×, and
        over 40 straight-time hours in a week at 1.5×. The seventh consecutive workday premium isn't
        calculated here — check those weeks by hand before you run payroll.
      </p>

      {editing && (
        <PunchEditor
          ev={editing}
          months={months}
          updateEvents={updateEvents}
          onClose={() => setEditing(null)}
          flash={flash}
        />
      )}

      {varDetail && (
        <VarianceModal
          row={varDetail}
          cfg={cfg}
          now={now}
          onFill={(v) => fillFromSchedule(varDetail.emp, v)}
          onClose={() => setVarDetail(null)}
        />
      )}

      {breakDetail && (
        <BreakDetailModal row={breakDetail} onClose={() => setBreakDetail(null)} />
      )}

      {viewSign && (
        <SignatureModal rec={viewSign} cfg={cfg} onClose={() => setViewSign(null)} />
      )}

      {csv != null && <CsvModal csv={csv} onClose={() => setCsv(null)} />}
    </div>
  );
}
