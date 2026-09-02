import { useState, useEffect } from "react";
import { fmtDateShort, fmtTime } from "../../lib/time.js";
import { sGet } from "../../storage/index.js";

export function SignatureModal({ rec, onClose }) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    let dead = false;
    (async () => {
      if (!rec.signatureKey) return;
      const d = await sGet(rec.signatureKey, null);
      if (!dead) setImg(d);
    })();
    return () => {
      dead = true;
    };
  }, [rec]);

  return (
    <div className="overlay">
      <div className="editCard">
        <button className="closeX" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="editTitle">
          {rec.agreed ? "Signed timecard" : "Disputed timecard"}
        </h2>
        <p className="muted">
          {rec.empName} · {rec.periodStart} to {rec.periodEnd} · submitted{" "}
          {fmtDateShort(new Date(rec.signedAt))} {fmtTime(new Date(rec.signedAt))}
        </p>

        <div className="sigSummary">
          <span>
            Regular <strong>{rec.totals.reg.toFixed(2)}</strong>
          </span>
          <span>
            OT <strong>{rec.totals.ot.toFixed(2)}</strong>
          </span>
          <span>
            2x <strong>{rec.totals.dt.toFixed(2)}</strong>
          </span>
          <span>
            Total <strong>{rec.totals.total.toFixed(2)}</strong>
          </span>
        </div>

        {rec.agreed ? (
          img ? (
            <img src={img} alt="Employee signature" className="sigImg" />
          ) : (
            <p className="muted">Signature image not found.</p>
          )
        ) : (
          <div className="disputeShow">
            <p className="disputeLabel">What they reported</p>
            <p className="disputeText">{rec.note}</p>
          </div>
        )}

        <p className="legalNote">
          These are the hours as they stood when it was submitted. If you edit punches afterward, the
          timecard flags it as changed so you can get a fresh sign-off.
        </p>
      </div>
    </div>
  );
}
