import { useState, useEffect } from "react";
import { MEAL_START } from "../../lib/payroll.js";
import { fmtDateShort, fmtTime } from "../../lib/time.js";
import { sGet } from "../../storage/index.js";

export function PunchList({ emp, events, onEdit, onDelete, onAdd, onTogglePaid, cfg }) {
  const label = {
    in: "Clock in",
    out: "Clock out",
    mealStart: "Lunch start",
    mealEnd: "Lunch end",
    restStart: "Rest start",
    restEnd: "Rest end",
    breakStart: "Lunch start",
    breakEnd: "Lunch end",
    breakAttest: "Break answers",
  };
  const [photos, setPhotos] = useState({});
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = {};
      for (const ev of events) {
        if (!ev.photoKey) continue;
        const data = await sGet(ev.photoKey, null);
        if (data) found[ev.id] = data;
      }
      if (!cancelled) setPhotos(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [events]);

  return (
    <div className="punches">
      <div className="punchesHead">
        <h3>{emp?.name} — every punch this week</h3>
        <button className="btn tiny primary" onClick={onAdd}>
          Add a punch
        </button>
      </div>
      {events.length === 0 ? (
        <p className="muted">No punches this week.</p>
      ) : (
        <ul className="punchList">
          {events.map((ev) => (
            <li key={ev.id}>
              {photos[ev.id] ? (
                <button
                  className="thumbBtn"
                  onClick={() => setZoom({ src: photos[ev.id], ev })}
                  aria-label="Enlarge photo"
                >
                  <img src={photos[ev.id]} alt="" className="thumb" />
                </button>
              ) : (
                <span className="thumb noPhoto" title={ev.photoKey ? "Photo expired" : "No photo"}>
                  {ev.photoKey ? "exp" : "—"}
                </span>
              )}
              <span className={`punchType ${ev.type}`}>{label[ev.type]}</span>
              <span className="punchWhen">
                {fmtDateShort(new Date(ev.ts))} · {fmtTime(new Date(ev.ts))}
              </span>
              {ev.filled && <span className="editedTag filled">from schedule</span>}
              {ev.edited && <span className="editedTag">edited</span>}
              {MEAL_START.includes(ev.type) && cfg?.mealPay === "discretionary" && (
                <button
                  className={`payTag ${ev.paidMeal ? "on" : ""}`}
                  onClick={() => onTogglePaid(ev)}
                >
                  {ev.paidMeal ? "Paid lunch — tap to undo" : "Pay this lunch"}
                </button>
              )}
              {MEAL_START.includes(ev.type) && cfg?.mealPay === "always" && (
                <span className="payTag on static">Paid lunch</span>
              )}
              <span className="punchActs">
                <button className="btn tiny" onClick={() => onEdit(ev)}>
                  Edit
                </button>
                <button className="btn tiny danger" onClick={() => onDelete(ev)}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {zoom && (
        <div className="overlay" onClick={() => setZoom(null)}>
          <div className="zoomCard" onClick={(e) => e.stopPropagation()}>
            <button className="closeX" onClick={() => setZoom(null)} aria-label="Close">
              ✕
            </button>
            <img src={zoom.src} alt="" className="zoomImg" />
            <p className="zoomMeta">
              {emp?.name} · {label[zoom.ev.type]} · {fmtDateShort(new Date(zoom.ev.ts))}{" "}
              {fmtTime(new Date(zoom.ev.ts))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
