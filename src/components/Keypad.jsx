import { useState, useEffect } from "react";
import { CameraFeed } from "./CameraFeed.jsx";

/* ---------- shared UI ---------- */
/* `inline` renders the pad as page content instead of an overlay (the
   PIN-only home screen). `onStart` fires on the first digit so the camera
   can warm up while the rest of the PIN is typed. */
export function Keypad({ title, subtitle, onSubmit, onCancel, onStart, error, length = 4, cam, inline }) {
  const [val, setVal] = useState("");
  useEffect(() => {
    if (val.length === length) {
      const v = val;
      setVal("");
      onSubmit(v);
    }
  }, [val, length, onSubmit]);
  const press = (k) => {
    if (k === "del") setVal((v) => v.slice(0, -1));
    else if (val.length < length) {
      if (val === "" && onStart) onStart();
      setVal((v) => v + k);
    }
  };
  const card = (
      <div className={`pinCard ${inline ? "inline" : ""}`}>
        {onCancel && (
          <button className="closeX" onClick={onCancel} aria-label="Cancel">
            ✕
          </button>
        )}
        {cam && <CameraFeed cam={cam} size="sm" />}
        <h2 className="pinName">{title}</h2>
        <p className="pinSub">{subtitle}</p>
        <div className={`dots ${error ? "shake" : ""}`}>
          {Array.from({ length }).map((_, i) => (
            <span key={i} className={`dot ${i < val.length ? "on" : ""}`} />
          ))}
        </div>
        {error ? <p className="pinErr">{error}</p> : <p className="pinErrHold" />}
        <div className="keys">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
            <button key={k} className="key" onClick={() => press(k)}>
              {k}
            </button>
          ))}
          <span />
          <button className="key" onClick={() => press("0")}>
            0
          </button>
          <button className="key keyDel" onClick={() => press("del")}>
            ⌫
          </button>
        </div>
      </div>
  );
  return inline ? card : <div className="overlay">{card}</div>;
}
