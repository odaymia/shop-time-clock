import { useState, useEffect } from "react";
import { schedKeyFor } from "../../lib/keys.js";
import { SHIFT_PRESETS, fmtHHMM, shiftHours } from "../../lib/schedule.js";
import { addDays, dayKey, pad2, startOfWeek } from "../../lib/time.js";
import { sGet, sSet } from "../../storage/index.js";
import { useStorageVersion } from "../../hooks/useCloud.js";

/* ---------- schedule builder ---------- */
export function ScheduleBuilder({ cfg, employees, flash, clip, setClip }) {
  const [offset, setOffset] = useState(0);
  const [sched, setSched] = useState(undefined);
  const [editing, setEditing] = useState(null);
  const version = useStorageVersion();
  const weekStart = addDays(startOfWeek(new Date(), cfg.weekStart), offset * 7);
  const key = schedKeyFor(dayKey(weekStart));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const roster = employees.filter((e) => e.active !== false);
  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(
    weekStart,
    6
  ).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  useEffect(() => {
    let dead = false;
    (async () => {
      const s = await sGet(key, null);
      if (!dead) setSched(s || { published: false, shifts: {} });
    })();
    return () => {
      dead = true;
    };
  }, [key, version]);

  const persist = async (next) => {
    setSched(next);
    await sSet(key, next);
  };

  const setShift = async (empId, dKey, shift) => {
    const next = { ...sched, shifts: { ...(sched.shifts || {}) } };
    const forEmp = { ...(next.shifts[empId] || {}) };
    if (shift) forEmp[dKey] = shift;
    else delete forEmp[dKey];
    next.shifts[empId] = forEmp;
    await persist(next);
  };

  const copyLastWeek = async () => {
    const prev = await sGet(schedKeyFor(dayKey(addDays(weekStart, -7))), null);
    if (!prev || !prev.shifts) return flash("Nothing to copy from last week", "out");
    const shifts = {};
    for (const [empId, byDay] of Object.entries(prev.shifts)) {
      shifts[empId] = {};
      for (const [dk, sh] of Object.entries(byDay)) {
        const shifted = dayKey(addDays(new Date(`${dk}T12:00:00`), 7));
        shifts[empId][shifted] = sh;
      }
    }
    await persist({ ...sched, shifts });
    flash("Copied last week's schedule");
  };

  /* Copy/paste a whole week. The clipboard keys shifts by weekday offset
     (0 = first day of the pay week) rather than by date, so a week copied
     from August pastes cleanly onto any week in the calendar. */
  const copyWeek = () => {
    const shifts = {};
    let n = 0;
    for (const [empId, byDay] of Object.entries(sched.shifts || {})) {
      for (const [dk, sh] of Object.entries(byDay)) {
        const off = days.findIndex((d) => dayKey(d) === dk);
        if (off < 0) continue;
        (shifts[empId] ||= {})[off] = sh;
        n++;
      }
    }
    if (!n) return flash("Nothing on this week to copy", "out");
    setClip({ shifts, count: n, label: weekLabel });
    flash(`Copied ${n} shift${n === 1 ? "" : "s"} — go to another week and paste`);
  };

  const pasteWeek = async () => {
    if (!clip) return;
    const shifts = {};
    for (const [empId, byOff] of Object.entries(clip.shifts)) {
      shifts[empId] = {};
      for (const [off, sh] of Object.entries(byOff)) shifts[empId][dayKey(days[Number(off)])] = sh;
    }
    await persist({ ...sched, shifts });
    flash(`Pasted the week of ${clip.label}`);
  };

  const clearWeek = async () => {
    await persist({ ...sched, shifts: {} });
    flash("Week cleared");
  };

  const togglePublish = async () => {
    const now = Date.now();
    const next = { ...sched, published: !sched.published, publishedAt: now };
    await persist(next);
    flash(next.published ? "Schedule posted — your crew can see it" : "Schedule unposted");
  };

  if (sched === undefined) return <div className="pane"><p className="muted">Loading…</p></div>;

  const empHours = (empId) =>
    days.reduce((a, d) => a + shiftHours(sched.shifts?.[empId]?.[dayKey(d)], cfg), 0);
  const dayHeads = (d) =>
    roster.filter((e) => sched.shifts?.[e.id]?.[dayKey(d)]).length;
  const weekTotal = roster.reduce((a, e) => a + empHours(e.id), 0);

  return (
    <div className="pane">
      <div className="weekNav">
        <button className="btn ghost" onClick={() => setOffset((o) => o - 1)}>
          ‹ Previous
        </button>
        <div className="weekLabel">
          <strong>
            {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
            {addDays(weekStart, 6).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </strong>
          <span>
            {offset === 0 ? "This week" : offset === 1 ? "Next week" : `${offset} weeks out`}
          </span>
        </div>
        <button className="btn ghost" onClick={() => setOffset((o) => o + 1)}>
          Next ›
        </button>
        <button className="btn" onClick={copyLastWeek}>
          Copy last week
        </button>
        <button className="btn" onClick={copyWeek}>
          Copy this week
        </button>
        <button
          className="btn"
          onClick={pasteWeek}
          disabled={!clip}
          title={clip ? `${clip.count} shifts from ${clip.label}` : "Copy a week first"}
        >
          {clip ? `Paste ${clip.label}` : "Paste"}
        </button>
        <button className={`btn ${sched.published ? "" : "primary"}`} onClick={togglePublish}>
          {sched.published ? "Unpost" : "Post to the crew"}
        </button>
      </div>

      <div className={`postState ${sched.published ? "live" : ""}`}>
        {sched.published
          ? "Posted. Your crew sees this when they tap their name and enter their PIN. Any change you make here shows up right away."
          : "Not posted yet. Nobody can see this until you post it."}
      </div>

      {roster.length === 0 ? (
        <p className="muted pad">Add people to the roster first.</p>
      ) : (
        <div className="tableWrap">
          <table className="tc sched">
            <thead>
              <tr>
                <th className="stick">Name</th>
                {days.map((d) => (
                  <th key={dayKey(d)}>
                    {d.toLocaleDateString(undefined, { weekday: "short" })}
                    <em>{d.getDate()}</em>
                  </th>
                ))}
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((e) => {
                const hrs = empHours(e.id);
                return (
                  <tr key={e.id}>
                    <td className="stick nameCell">{e.name}</td>
                    {days.map((d) => {
                      const k = dayKey(d);
                      const sh = sched.shifts?.[e.id]?.[k];
                      return (
                        <td key={k} className="cellPad">
                          <button
                            className={`schedCell ${sh ? "on" : ""}`}
                            onClick={() => setEditing({ emp: e, dKey: k, date: d, shift: sh })}
                          >
                            {sh ? (
                              <>
                                <span>
                                  {fmtHHMM(sh.start)}–{fmtHHMM(sh.end)}
                                </span>
                                {sh.note && <em>{sh.note}</em>}
                              </>
                            ) : (
                              <span className="addMark">+</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td className={`num tot ${hrs > 40 ? "ot" : ""}`}>{hrs.toFixed(1)}</td>
                  </tr>
                );
              })}
              <tr className="coverRow">
                <td className="stick">On the floor</td>
                {days.map((d) => {
                  const n = dayHeads(d);
                  return (
                    <td
                      key={dayKey(d)}
                      className={n > 0 && n < cfg.minStaff ? "hot" : n === 0 ? "zero" : ""}
                    >
                      {n === 0 ? "—" : n}
                    </td>
                  );
                })}
                <td className="num tot">{weekTotal.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {(() => {
        const thin = days.filter((d) => {
          const n = dayHeads(d);
          return n > 0 && n < cfg.minStaff;
        });
        const over = roster.filter((e) => empHours(e.id) > 40);
        if (!thin.length && !over.length) return null;
        return (
          <div className="schedWarn">
            {thin.length > 0 && (
              <p>
                Below your {cfg.minStaff}-person floor minimum on{" "}
                {thin.map((d) => d.toLocaleDateString(undefined, { weekday: "long" })).join(", ")}.
              </p>
            )}
            {over.map((e) => (
              <p key={e.id}>
                {e.name} is scheduled {empHours(e.id).toFixed(1)} hours — anything past 40 comes back
                at time and a half.
              </p>
            ))}
          </div>
        );
      })()}

      <div className="schedFoot">
        <button className="btn tiny danger" onClick={clearWeek}>
          Clear this week
        </button>
      </div>

      {editing && (
        <ShiftEditor
          cfg={cfg}
          entry={editing}
          onSave={(sh) => {
            setShift(editing.emp.id, editing.dKey, sh);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export function ShiftEditor({ cfg, entry, onSave, onClose }) {
  const existing = entry.shift;
  const [start, setStart] = useState(existing?.start || `${pad2(cfg.openHour)}:00`);
  const [end, setEnd] = useState(existing?.end || `${pad2(cfg.closeHour)}:00`);
  const [lunch, setLunch] = useState(existing?.lunch ?? 30);
  const [note, setNote] = useState(existing?.note || "");

  const preview = shiftHours({ start, end, lunch }, cfg);
  const bad = preview <= 0;

  return (
    <div className="overlay">
      <div className="editCard">
        <button className="closeX" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="editTitle">{entry.emp.name}</h2>
        <p className="muted">
          {entry.date.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>

        <div className="presetRow">
          {SHIFT_PRESETS.map((p) => (
            <button
              key={p.label}
              className="btn tiny"
              onClick={() => {
                setStart(p.start);
                setEnd(p.end);
                setLunch(p.lunch);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="fldRow">
          <label className="fld">
            <span>Starts</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="fld">
            <span>Ends</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <div className="fldRow">
          <label className="fld">
            <span>Unpaid lunch</span>
            <select value={lunch} onChange={(e) => setLunch(Number(e.target.value))}>
              <option value={0}>None</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </label>
          <label className="fld">
            <span>Note (they'll see this)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Cover front counter"
            />
          </label>
        </div>

        <p className={`shiftPreview ${bad ? "bad" : ""}`}>
          {bad ? "End time has to come after the start." : `${preview.toFixed(2)} paid hours`}
          {!bad && preview > 8 ? " · over 8, so daily overtime kicks in" : ""}
        </p>

        <button
          className="btn primary lg full"
          disabled={bad}
          onClick={() => onSave({ start, end, lunch, note: note.trim() })}
        >
          {existing ? "Save shift" : "Add shift"}
        </button>
        {existing && (
          <button className="linkBtn wide" onClick={() => onSave(null)}>
            Remove this shift
          </button>
        )}
      </div>
    </div>
  );
}
