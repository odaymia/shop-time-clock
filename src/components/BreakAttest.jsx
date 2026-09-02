import { useState } from "react";

/* ---------- daily break attestation ---------- */
/* Brinker v. Superior Court says the employer must provide breaks, not
   police them. So this asks what happened rather than blocking anyone:
   a free choice to skip is a waiver, being prevented is a premium hour. */
export function BreakAttest({ emp, comp, onSubmit, onSkip }) {
  const [meal, setMeal] = useState(null);
  const [rest, setRest] = useState(null);
  const [note, setNote] = useState("");

  const needMeal = comp.meal1 && !comp.meal1.ok;
  const needRest = comp.restsOwed > comp.restsTaken;
  const canWaive = comp.meal1?.canWaive;
  const ready = (!needMeal || meal) && (!needRest || rest);

  const mealQ = !comp.meal1?.taken
    ? "You didn't take a lunch today."
    : comp.meal1.short
    ? `Your lunch was ${comp.meal1.minutes} minutes instead of 30.`
    : "Your lunch started after the end of your fifth hour.";

  return (
    <div className="overlay">
      <div className="reviewCard">
        <h2 className="reviewTitle">Before you go, {emp.name.split(" ")[0]}</h2>
        <p className="reviewSub">
          Answer honestly. There's no wrong answer and nothing here counts against you.
        </p>

        {needMeal && (
          <div className="attestBlock">
            <p className="attestQ">{mealQ}</p>
            <div className="attestOpts">
              <button
                className={`attestOpt ${meal === "waived" ? "on" : ""}`}
                onClick={() => setMeal("waived")}
              >
                <strong>I chose to skip or cut it short</strong>
                <span>
                  Nobody stopped me. I was free to take it{canWaive ? " and I gave it up" : ""}.
                </span>
              </button>
              <button
                className={`attestOpt ${meal === "denied" ? "on" : ""}`}
                onClick={() => setMeal("denied")}
              >
                <strong>I couldn't take it</strong>
                <span>Too busy, told not to, or no coverage. The shop owes me for this.</span>
              </button>
            </div>
          </div>
        )}

        {needRest && (
          <div className="attestBlock">
            <p className="attestQ">
              You logged {comp.restsTaken} of {comp.restsOwed} paid rest breaks.
            </p>
            <div className="attestOpts">
              <button
                className={`attestOpt ${rest === "taken" ? "on" : ""}`}
                onClick={() => setRest("taken")}
              >
                <strong>I took them, just didn't clock them</strong>
                <span>I had my breaks — I forgot to hit the button.</span>
              </button>
              <button
                className={`attestOpt ${rest === "waived" ? "on" : ""}`}
                onClick={() => setRest("waived")}
              >
                <strong>I chose not to take them</strong>
                <span>They were available and I skipped them.</span>
              </button>
              <button
                className={`attestOpt ${rest === "denied" ? "on" : ""}`}
                onClick={() => setRest("denied")}
              >
                <strong>I couldn't take them</strong>
                <span>Too busy or told not to. The shop owes me for this.</span>
              </button>
            </div>
          </div>
        )}

        {(meal === "denied" || rest === "denied") && (
          <label className="fld">
            <span>Anything you want your manager to know? (optional)</span>
            <textarea
              className="disputeBox short"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Example: three cars stacked up and nobody could cover my bay."
            />
          </label>
        )}

        <div className="reviewActs">
          <button
            className="bigAct in"
            disabled={!ready}
            onClick={() => onSubmit({ meal1: meal, rest, note: note.trim() })}
          >
            Submit and clock out
          </button>
        </div>
        <p className="signFine">
          If you say you were prevented from taking a break, California requires an extra hour of pay
          at your regular rate. That gets flagged for payroll automatically.
        </p>
        <button className="linkBtn wide" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
