import { useState, useRef } from "react";
import { SignaturePad } from "./SignaturePad.jsx";
import { periodEnd } from "../lib/payroll.js";
import { dayKey, fmtDateShort, fmtTime } from "../lib/time.js";

/* ---------- end-of-period review ---------- */
export function ReviewSheet({ emp, cfg, summary, periodStartDate, resign, onSubmit, onDefer }) {
  const [mode, setMode] = useState("review"); // review | sign | dispute
  const [inked, setInked] = useState(false);
  const [note, setNote] = useState("");
  const padHost = useRef(null);
  const pEnd = periodEnd(cfg, periodStartDate);

  const sign = () => {
    const canvas = padHost.current && padHost.current.querySelector("canvas");
    const png = canvas && canvas.__export ? canvas.__export() : null;
    if (!png) return;
    onSubmit({ agreed: true, signature: png, note: "" });
  };

  return (
    <div className="overlay">
      <div className="reviewCard">
        <header className="reviewHead">
          <div>
            <h2 className="reviewTitle">
              {resign ? "Your hours changed" : "Check your hours"}, {emp.name.split(" ")[0]}
            </h2>
            <p className="reviewSub">
              Pay period {periodStartDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
              {pEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              {resign ? " · they moved since you signed, so please check and sign again" : ""}
            </p>
          </div>
          <div className="reviewTotal">
            <strong>{summary.totals.total.toFixed(2)}</strong>
            <span>hours</span>
          </div>
        </header>

        {mode === "review" && (
          <>
            <ul className="reviewDays">
              {summary.rows.map((r) => (
                <li key={dayKey(r.date)} className={r.hours === 0 ? "off" : ""}>
                  <span className="rdDay">{fmtDateShort(r.date)}</span>
                  <span className="rdPunch">
                    {r.sessions.length === 0
                      ? "Off"
                      : r.sessions
                          .map(
                            (s) =>
                              `${fmtTime(new Date(s.start))} – ${
                                s.end ? fmtTime(new Date(s.end)) : "no clock-out"
                              }`
                          )
                          .join(", ")}
                  </span>
                  <span className="rdBreak">
                    {r.mealMs > 0
                      ? `${Math.round(r.mealMs / 60000)}m lunch${
                          r.paidMealMs > 0 ? " (shop paid)" : ""
                        }`
                      : r.hours > 5
                      ? "no lunch"
                      : ""}
                    {r.restCount > 0 ? ` · ${r.restCount} rest` : ""}
                  </span>
                  <span className="rdHrs">{r.hours > 0 ? r.hours.toFixed(2) : "—"}</span>
                </li>
              ))}
            </ul>

            <div className="reviewSplit">
              <span>
                Regular <strong>{summary.totals.reg.toFixed(2)}</strong>
              </span>
              <span>
                Overtime <strong>{summary.totals.ot.toFixed(2)}</strong>
              </span>
              <span>
                Double time <strong>{summary.totals.dt.toFixed(2)}</strong>
              </span>
            </div>

            {summary.openShift && (
              <p className="reviewWarn">
                One shift has no clock-out, so these hours are incomplete. Tell your manager before
                you sign.
              </p>
            )}

            <div className="reviewActs">
              <button className="bigAct in" onClick={() => setMode("sign")}>
                These hours are right
              </button>
              <button className="bigAct brk" onClick={() => setMode("dispute")}>
                Something's wrong
              </button>
            </div>
            <button className="linkBtn wide" onClick={onDefer}>
              Not now — remind me next punch
            </button>
          </>
        )}

        {mode === "sign" && (
          <>
            <p className="signLead">
              Sign below to confirm you worked {summary.totals.total.toFixed(2)} hours this pay
              period, including{" "}
              {summary.totals.ot + summary.totals.dt > 0
                ? `${(summary.totals.ot + summary.totals.dt).toFixed(2)} overtime hours`
                : "no overtime"}
              , and that you were able to take your meal and rest breaks.
            </p>
            <div ref={padHost}>
              <SignaturePad onChange={setInked} />
            </div>
            <div className="reviewActs">
              <button className="bigAct in" disabled={!inked} onClick={sign}>
                Sign and finish
              </button>
              <button className="bigAct brk" onClick={() => setMode("review")}>
                Back to my hours
              </button>
            </div>
            <p className="signFine">
              Signing doesn't give up any pay you're owed. If you find a mistake later, tell your
              manager and it gets fixed.
            </p>
          </>
        )}

        {mode === "dispute" && (
          <>
            <p className="signLead">
              Tell us what's off and your manager will review it before payroll runs. Nothing you say
              here affects your pay for hours you actually worked.
            </p>
            <label className="fld">
              <span>What's wrong?</span>
              <textarea
                className="disputeBox"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Example: Thursday I clocked out at 6:15, not 5:30. Or: I missed my lunch on Tuesday."
              />
            </label>
            <div className="reviewActs">
              <button
                className="bigAct out"
                disabled={!note.trim()}
                onClick={() => onSubmit({ agreed: false, signature: null, note: note.trim() })}
              >
                Send to manager
              </button>
              <button className="bigAct brk" onClick={() => setMode("review")}>
                Back to my hours
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
