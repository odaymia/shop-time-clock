import { useState, useEffect } from "react";
import { schedKeyFor } from "../lib/keys.js";
import { fmtHHMM, shiftHours } from "../lib/schedule.js";
import { addDays, dayKey, startOfWeek } from "../lib/time.js";
import { sGet } from "../storage/index.js";
import { useStorageVersion } from "../hooks/useCloud.js";

/* ---------- one person's schedule ---------- */
/* Reached only after a correct PIN, and it never loads anyone else's
   shifts into view — the roster is filtered down to this employee before
   anything renders. */
export function MySchedule({ emp, cfg, onClose }) {
  const [offset, setOffset] = useState(0);
  const [sched, setSched] = useState(undefined);
  const version = useStorageVersion();
  const weekStart = addDays(startOfWeek(new Date(), cfg.weekStart), offset * 7);
  const todayKey = dayKey(new Date());

  useEffect(() => {
    let dead = false;
    setSched(undefined);
    (async () => {
      const s = await sGet(schedKeyFor(dayKey(weekStart)), null);
      if (!dead) setSched(s);
    })();
    return () => {
      dead = true;
    };
  }, [offset, version]); // eslint-disable-line

  const mine = sched?.published ? sched.shifts?.[emp.id] || {} : null;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const total = mine
    ? days.reduce((a, d) => a + shiftHours(mine[dayKey(d)], cfg), 0)
    : 0;

  return (
    <div className="overlay">
      <div className="reviewCard">
        <button className="closeX" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <header className="reviewHead">
          <div>
            <h2 className="reviewTitle">Your schedule</h2>
            <p className="reviewSub">
              {emp.name} ·{" "}
              {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
              {addDays(weekStart, 6).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          {mine && (
            <div className="reviewTotal">
              <strong>{total.toFixed(1)}</strong>
              <span>hours</span>
            </div>
          )}
        </header>

        <div className="weekNav tight">
          <button
            className="btn ghost"
            onClick={() => setOffset((o) => o - 1)}
            disabled={offset <= -1}
          >
            ‹ Last week
          </button>
          <span className="weekTag">
            {offset === 0 ? "This week" : offset === 1 ? "Next week" : `${offset} weeks out`}
          </span>
          <button
            className="btn ghost"
            onClick={() => setOffset((o) => o + 1)}
            disabled={offset >= 3}
          >
            Next week ›
          </button>
        </div>

        {sched === undefined ? (
          <p className="muted pad">Loading…</p>
        ) : !mine ? (
          <div className="schedEmpty">
            <p>This week isn't posted yet.</p>
            <span>Your manager will put it up when it's ready.</span>
          </div>
        ) : (
          <ul className="myDays">
            {days.map((d) => {
              const k = dayKey(d);
              const sh = mine[k];
              const isToday = k === todayKey;
              return (
                <li key={k} className={`${isToday ? "today" : ""} ${sh ? "" : "off"}`}>
                  <span className="myDayName">
                    {d.toLocaleDateString(undefined, { weekday: "long" })}
                    <em>{d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</em>
                  </span>
                  {sh ? (
                    <>
                      <span className="myTimes">
                        {fmtHHMM(sh.start)} – {fmtHHMM(sh.end)}
                      </span>
                      <span className="myMeta">
                        {shiftHours(sh, cfg).toFixed(1)} hrs
                        {sh.lunch ? ` · ${sh.lunch}m lunch` : ""}
                      </span>
                      {sh.note && <span className="myNote">{sh.note}</span>}
                    </>
                  ) : (
                    <span className="myTimes offTxt">Off</span>
                  )}
                  {isToday && <span className="todayTag">Today</span>}
                </li>
              );
            })}
          </ul>
        )}

        <button className="linkBtn wide" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
