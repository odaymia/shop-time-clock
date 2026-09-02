import { useState } from "react";

/* ---------- setup ---------- */
export function Setup({ cfg, onDone }) {
  const [name, setName] = useState(cfg.shopName || "");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");
  const go = () => {
    if (!name.trim()) return setErr("Give the shop a name.");
    if (!/^\d{4}$/.test(pin)) return setErr("The manager PIN needs to be 4 digits.");
    if (pin !== pin2) return setErr("The two PINs don't match.");
    onDone({ ...cfg, shopName: name.trim(), managerPin: pin });
  };
  return (
    <div className="setupWrap">
      <div className="setupCard">
        <h1 className="setupTitle">Set up the time clock</h1>
        <p className="setupLead">
          This runs on the shop iPad. Your crew taps their name and enters a PIN to punch in and out.
        </p>
        <label className="fld">
          <span>Shop name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shop name" />
        </label>
        <label className="fld">
          <span>Manager PIN</span>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="4 digits"
          />
        </label>
        <label className="fld">
          <span>Confirm manager PIN</span>
          <input
            value={pin2}
            onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="4 digits"
          />
        </label>
        {err && <p className="fldErr">{err}</p>}
        <button className="btn primary lg full" onClick={go}>
          Start the clock
        </button>
        <p className="setupNote">
          The manager PIN opens timecards, the roster, and settings. Keep it off the shop floor.
        </p>
      </div>
    </div>
  );
}
