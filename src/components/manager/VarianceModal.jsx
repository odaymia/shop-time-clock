import { fmtHHMM, schedTs } from "../../lib/schedule.js";
import { fmtDateShort, fmtTime } from "../../lib/time.js";

export function VarianceModal({ row, cfg, now, onFill, onClose }) {
  /* only offer to fill a no-show once the scheduled shift is actually over */
  const shiftEnded = (v) => {
    const s = schedTs(v.date, v.shift?.start);
    const e = schedTs(v.date, v.shift?.end, s);
    return e != null && e <= now;
  };
  const days = row.variance.filter((v) => v.schedH > 0 || v.actualH > 0);
  return (
    <div className="overlay">
      <div className="reviewCard">
        <button className="closeX" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="editTitle">{row.emp.name} against the schedule</h2>
        <div className="sigSummary">
          <span>
            Scheduled <strong>{row.schedTotal.toFixed(2)}</strong>
          </span>
          <span>
            Worked <strong>{row.totals.total.toFixed(2)}</strong>
          </span>
          <span>
            Difference{" "}
            <strong>
              {row.varTotal > 0 ? "+" : ""}
              {row.varTotal.toFixed(2)}
            </strong>
          </span>
        </div>

        {days.length === 0 ? (
          <p className="muted pad">Nothing scheduled or worked this week.</p>
        ) : (
          <ul className="varList">
            {days.map((v) => {
              const info = row.byDay[v.day];
              const punches = info
                ? info.sessions
                    .map(
                      (s) =>
                        `${fmtTime(new Date(s.start))}–${
                          s.end ? fmtTime(new Date(s.end)) : "open"
                        }`
                    )
                    .join(", ")
                : "no punches";
              return (
                <li key={v.day} className={v.kind || ""}>
                  <div className="varHead">
                    <strong>{fmtDateShort(v.date)}</strong>
                    <span className={v.diff > 0 ? "ot" : ""}>
                      {v.diff > 0 ? "+" : ""}
                      {v.diff.toFixed(2)} hrs
                    </span>
                  </div>
                  <div className="varLines">
                    <p>
                      <em>Scheduled</em>{" "}
                      {v.shift
                        ? `${fmtHHMM(v.shift.start)} – ${fmtHHMM(v.shift.end)} (${v.schedH.toFixed(
                            1
                          )} hrs)`
                        : "not on the schedule"}
                    </p>
                    <p>
                      <em>Actual</em> {punches}
                      {v.actualH > 0 ? ` (${v.actualH.toFixed(1)} hrs)` : ""}
                    </p>
                  </div>
                  {v.notes.length > 0 && (
                    <ul className="varNotes">
                      {v.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}
                  {v.kind === "noshow" && onFill && (
                    <div className="fillRow">
                      <button
                        className="btn tiny primary"
                        disabled={!shiftEnded(v)}
                        onClick={() => onFill(v)}
                      >
                        Clock in from schedule
                      </button>
                      <span>
                        {shiftEnded(v)
                          ? "Adds punches for the scheduled shift, lunch, and rest breaks, tagged so they never pass for real punches. Confirm with them that they actually worked it and took their breaks."
                          : "Available once the scheduled shift has ended."}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="legalNote">
          Anything inside {cfg.graceMin} minutes of the scheduled time isn't flagged. Change that
          slack in Settings. Worth remembering that time on the clock is time you owe regardless of
          what the schedule said — a tech who clocks in early is still working, so the fix is a
          conversation, not an edit to their punches.
        </p>
      </div>
    </div>
  );
}
