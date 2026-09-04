import { useState } from "react";
import { CloudSync } from "../CloudSync.jsx";

/* ---------- settings ---------- */
export function Settings({ cfg, saveCfg, flash, employees = [] }) {
  const [d, setD] = useState(cfg);
  const [pin, setPin] = useState("");
  const set = (k, v) => setD({ ...d, [k]: v });
  const save = async () => {
    const next = { ...d };
    if (pin) {
      if (!/^\d{4}$/.test(pin)) return flash("Manager PIN must be 4 digits", "out");
      const clash = employees.find((e) => e.pin === pin);
      if (clash) return flash(`${clash.name} already uses that PIN — pick another`, "out");
      next.managerPin = pin;
    }
    await saveCfg(next);
    setPin("");
    flash("Settings saved");
  };
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return (
    <div className="pane">
      <h2 className="paneTitle">Settings</h2>
      <div className="settingsGrid">
        <label className="fld">
          <span>Shop name</span>
          <input value={d.shopName} onChange={(e) => set("shopName", e.target.value)} />
        </label>
        <label className="fld">
          <span>Home screen</span>
          <select value={d.kioskMode || "tiles"} onChange={(e) => set("kioskMode", e.target.value)}>
            <option value="tiles">Name tiles — tap your name, then enter your PIN</option>
            <option value="pin">PIN pad only — no names shown until a PIN is entered</option>
          </select>
        </label>
        <label className="fld">
          <span>Pay week starts</span>
          <select value={d.weekStart} onChange={(e) => set("weekStart", Number(e.target.value))}>
            {dayNames.map((n, i) => (
              <option key={n} value={i}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span>Round punches to</span>
          <select value={d.roundingMin} onChange={(e) => set("roundingMin", Number(e.target.value))}>
            <option value={0}>Exact minute</option>
            <option value={5}>Nearest 5 minutes</option>
            <option value={6}>Nearest 6 minutes (tenth of an hour)</option>
            <option value={15}>Nearest 15 minutes</option>
          </select>
        </label>
        <label className="fld">
          <span>Overtime rules</span>
          <select value={d.otRules} onChange={(e) => set("otRules", e.target.value)}>
            <option value="ca">California (daily and weekly)</option>
            <option value="flsa">Federal only (over 40 in a week)</option>
          </select>
        </label>
        <label className="fld">
          <span>California meal and rest tracking</span>
          <select
            value={d.breakRules ? "on" : "off"}
            onChange={(e) => set("breakRules", e.target.value === "on")}
          >
            <option value="on">On — track 30-min lunches and 10-min rest breaks</option>
            <option value="off">Off</option>
          </select>
        </label>
        {d.breakRules && (
          <label className="fld">
            <span>Warn the floor before a lunch deadline</span>
            <select
              value={d.breakReminderMin}
              onChange={(e) => set("breakReminderMin", Number(e.target.value))}
            >
              <option value={10}>10 minutes ahead</option>
              <option value={20}>20 minutes ahead</option>
              <option value={30}>30 minutes ahead</option>
              <option value={45}>45 minutes ahead</option>
            </select>
          </label>
        )}
        <div className="fldRow">
          <label className="fld">
            <span>Opens at</span>
            <select value={d.openHour} onChange={(e) => set("openHour", Number(e.target.value))}>
              {Array.from({ length: 13 }, (_, i) => i + 4).map((h) => (
                <option key={h} value={h}>
                  {h % 12 || 12}:00 {h >= 12 ? "PM" : "AM"}
                </option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span>Closes at</span>
            <select value={d.closeHour} onChange={(e) => set("closeHour", Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 12).map((h) => (
                <option key={h} value={h}>
                  {h % 12 || 12}:00 {h >= 12 ? "PM" : "AM"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="fld">
          <span>Photo at every punch</span>
          <select
            value={d.photos ? "on" : "off"}
            onChange={(e) => set("photos", e.target.value === "on")}
          >
            <option value="on">On — front camera snaps a photo</option>
            <option value="off">Off</option>
          </select>
        </label>
        {d.photos && (
          <div className="fldRow">
            <label className="fld">
              <span>If the camera fails</span>
              <select
                value={d.photoRequired ? "block" : "allow"}
                onChange={(e) => set("photoRequired", e.target.value === "block")}
              >
                <option value="allow">Let the punch through</option>
                <option value="block">Block the punch</option>
              </select>
            </label>
            <label className="fld">
              <span>Keep photos for</span>
              <select
                value={d.photoRetentionDays}
                onChange={(e) => set("photoRetentionDays", Number(e.target.value))}
              >
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={45}>45 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
          </div>
        )}
        <label className="fld">
          <span>Sign off on hours at the end of the pay period</span>
          <select
            value={d.attestation ? "on" : "off"}
            onChange={(e) => set("attestation", e.target.value === "on")}
          >
            <option value="on">On — review and sign at the last clock-out</option>
            <option value="off">Off</option>
          </select>
        </label>
        {d.breakRules && (
          <>
            <label className="fld">
              <span>Paying for the 30-minute lunch</span>
              <select value={d.mealPay} onChange={(e) => set("mealPay", e.target.value)}>
                <option value="unpaid">Never — lunch is always unpaid</option>
                <option value="discretionary">When I say so — I mark individual lunches paid</option>
                <option value="always">Always — every lunch is paid</option>
              </select>
            </label>

            {d.mealPay === "discretionary" && (
              <div className="noteBox">
                Lunches start out unpaid. To gift one, open Timecards, hit Punches next to the tech,
                and tap Pay this lunch on that day. It adds the 30 minutes back to their hours right
                away. The break itself doesn't change — they're still off duty and free to leave, so
                nothing about compliance shifts.
              </div>
            )}
            {d.mealPay === "always" && (
              <div className="noteBox">
                Every lunch becomes hours worked. A tech clocked 8:00 to 5:00 lands at 9 hours
                instead of 8.5, so an hour of daily overtime shows up where a half hour did before.
                Figure about 2.5 paid hours a week per tech, some of it at time and a half.
              </div>
            )}
          </>
        )}

        <label className="fld">
          <span>Fewest people on the floor at once</span>
          <select value={d.minStaff} onChange={(e) => set("minStaff", Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "person" : "people"}
              </option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span>Slack before a punch counts as late or early</span>
          <select value={d.graceMin} onChange={(e) => set("graceMin", Number(e.target.value))}>
            {[0, 3, 6, 10, 15].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "Exact — flag any difference" : `${n} minutes`}
              </option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span>New manager PIN (leave blank to keep the current one)</span>
          <input
            value={pin}
            inputMode="numeric"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="4 digits"
          />
        </label>
      </div>
      <button className="btn primary lg" onClick={save}>
        Save settings
      </button>

      <h2 className="paneTitle cloudTitle">Cloud sync</h2>
      <div className="settingsGrid">
        <CloudSync />
      </div>
      <p className="legalNote">
        Rounding applies to how hours are totaled. The exact punch time is always kept underneath, so
        you can turn rounding off and the real numbers come back.
      </p>
      <p className="legalNote">
        Punch photos are small stills stored on this iPad only — nothing is uploaded anywhere. The
        camera preview stays visible while someone punches so nobody is recorded without seeing it.
        Photos delete themselves after the window you set above. California treats a face image as
        biometric-adjacent personal information, so tell your crew in writing that the clock takes a
        photo and why, and keep that notice with your handbook.
      </p>
    </div>
  );
}
