import { useState } from "react";
import { CameraFeed } from "./CameraFeed.jsx";
import { CAM_MSG } from "../hooks/useCamera.js";
import { MEAL_MIN_MS, REST_MIN_MS } from "../lib/payroll.js";
import { fmtTime, hoursText, pad2 } from "../lib/time.js";

/* ---------- action sheet ---------- */
export function ActionSheet({ emp, status, worked, onPunch, onCancel, cam, due, now, cfg, onSchedule }) {
  const isOut = status.state === "out";
  const onMeal = status.state === "meal";
  const onRest = status.state === "rest";
  const onClock = !isOut && !onMeal && !onRest;

  const mealElapsed = onMeal ? now - status.since : 0;
  const restElapsed = onRest ? now - status.since : 0;
  const mealShort = onMeal && mealElapsed < MEAL_MIN_MS - 30000;
  const [confirmShort, setConfirmShort] = useState(false);

  const mealLeft = Math.max(0, MEAL_MIN_MS - mealElapsed);
  const restLeft = Math.max(0, REST_MIN_MS - restElapsed);
  const mmss = (ms) =>
    `${Math.floor(ms / 60000)}:${pad2(Math.floor((ms % 60000) / 1000))}`;

  return (
    <div className="overlay">
      <div className="actCard">
        <button className="closeX" onClick={onCancel} aria-label="Cancel">
          ✕
        </button>
        {cam && <CameraFeed cam={cam} size="lg" />}
        <h2 className="actName">{emp.name}</h2>
        <p className="actMeta">
          {isOut
            ? "Not on the clock"
            : onMeal
            ? `On lunch since ${fmtTime(new Date(status.since))}`
            : onRest
            ? `On rest break since ${fmtTime(new Date(status.since))}`
            : `Clocked in at ${fmtTime(new Date(status.since))} · ${hoursText(worked)} today`}
        </p>

        {onMeal && (
          <div className={`breakTimer ${mealShort ? "short" : "done"}`}>
            <strong>{mealShort ? mmss(mealLeft) : "30:00+"}</strong>
            <span>
              {mealShort
                ? "left of your 30-minute lunch"
                : cfg?.mealPay === "always"
                ? "you've had a full lunch — head back whenever you're ready"
                : "you've had a full lunch — clock back in when ready"}
            </span>
          </div>
        )}
        {onRest && (
          <div className={`breakTimer ${restLeft > 0 ? "short" : "done"}`}>
            <strong>{restLeft > 0 ? mmss(restLeft) : "10:00+"}</strong>
            <span>
              {restLeft > 0 ? "left on your paid rest break" : "rest break complete"}
            </span>
          </div>
        )}

        {onClock && due && due.remaining < 60 * 60000 && (
          <div className={`dueBanner ${due.remaining < 0 ? "over" : ""}`}>
            {due.remaining < 0
              ? `${due.label} — it's past the legal cutoff of ${fmtTime(new Date(due.dueAt))}`
              : `${due.label} by ${fmtTime(new Date(due.dueAt))} · ${Math.round(
                  due.remaining / 60000
                )} min left`}
          </div>
        )}

        <div className="actBtns">
          {isOut && (
            <button className="bigAct in" onClick={() => onPunch("in")}>
              Clock in
            </button>
          )}
          {onClock && (
            <>
              <button className="bigAct meal" onClick={() => onPunch("mealStart")}>
                Start lunch
                <em>
                  {cfg?.mealPay === "always"
                    ? "30 minutes, paid — you're free to leave"
                    : "30 minutes, off the clock"}
                </em>
              </button>
              <button className="bigAct brk" onClick={() => onPunch("restStart")}>
                Start rest break
                <em>10 minutes, paid — stay on the clock</em>
              </button>
              <button className="bigAct out" onClick={() => onPunch("out")}>
                Clock out
              </button>
            </>
          )}
          {onMeal && !confirmShort && (
            <button
              className="bigAct in"
              onClick={() => (mealShort ? setConfirmShort(true) : onPunch("mealEnd"))}
            >
              Back from lunch
            </button>
          )}
          {onMeal && confirmShort && (
            <div className="shortWarn">
              <p>
                You've had {Math.floor(mealElapsed / 60000)} minutes. The full 30 is yours — nobody
                needs you back yet. If you go back now, it's recorded as your choice to end lunch
                early.
              </p>
              <button className="bigAct in" onClick={() => setConfirmShort(false)}>
                Finish my lunch
              </button>
              <button
                className="bigAct out"
                onClick={() =>
                  onPunch("mealEnd", {
                    earlyReturn: "chose",
                    lunchMinutes: Math.floor(mealElapsed / 60000),
                  })
                }
              >
                Go back to work now — my choice
              </button>
            </div>
          )}
          {onRest && (
            <button className="bigAct in" onClick={() => onPunch("restEnd")}>
              Back from rest break
            </button>
          )}
          {(onMeal || onRest) && !confirmShort && (
            <button className="bigAct out" onClick={() => onPunch("out")}>
              Clock out for the day
            </button>
          )}
          {!confirmShort && (
            <button className="linkBtn wide" onClick={onSchedule}>
              See my schedule
            </button>
          )}
        </div>
        {cam && cam.state !== "live" && (
          <p className="camNote">{CAM_MSG[cam.state] || "Camera off"}</p>
        )}
      </div>
    </div>
  );
}
