import { fmtDateShort } from "../../lib/time.js";

export function BreakDetailModal({ row, onClose }) {
  const answerText = {
    waived: "Employee said they chose to skip it",
    denied: "Employee said they were prevented — premium owed",
    taken: "Employee said they took it but didn't clock it",
  };
  return (
    <div className="overlay">
      <div className="reviewCard">
        <button className="closeX" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="editTitle">Break exceptions — {row.emp.name}</h2>
        <div className="sigSummary">
          <span>
            Meal premium <strong>{row.mealPrem} hr</strong>
          </span>
          <span>
            Rest premium <strong>{row.restPrem} hr</strong>
          </span>
          <span>
            Days flagged <strong>{row.flags.length}</strong>
          </span>
        </div>

        {row.flags.length === 0 ? (
          <p className="muted pad">Nothing flagged this week.</p>
        ) : (
          <ul className="flagList">
            {row.flags.map((f) => (
              <li key={f.day}>
                <div className="flagHead">
                  <strong>{fmtDateShort(f.date)}</strong>
                  <span>{f.comp.hours.toFixed(2)} hrs worked</span>
                </div>
                <ul className="flagIssues">
                  {f.comp.issues.map((i, n) => (
                    <li key={n}>{i}</li>
                  ))}
                </ul>
                {f.att ? (
                  <div className="flagAnswer">
                    {f.att.meal1 && <p>Lunch: {answerText[f.att.meal1]}</p>}
                    {f.att.rest && <p>Rest: {answerText[f.att.rest]}</p>}
                    {f.att.note && <p className="flagNote">“{f.att.note}”</p>}
                  </div>
                ) : (
                  <p className="flagAnswer missing">
                    No answer recorded — ask them what happened and note it before payroll.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="legalNote">
          A premium is one hour at the employee's regular rate of pay, and it isn't hours worked — it
          doesn't feed overtime. California caps it at one meal premium and one rest premium per day,
          which is how these totals are figured.
        </p>
      </div>
    </div>
  );
}
