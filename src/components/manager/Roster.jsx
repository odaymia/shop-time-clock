import { useState } from "react";
import { uid } from "../../lib/ids.js";

/* ---------- roster ---------- */
export function Roster({ employees, saveEmployees, flash, cfg }) {
  const [draft, setDraft] = useState(null);
  const blank = { id: "", name: "", role: "", pin: "", rate: "", active: true };

  const save = async () => {
    if (!draft.name.trim()) return flash("Name can't be blank", "out");
    if (!/^\d{4}$/.test(draft.pin)) return flash("PIN must be 4 digits", "out");
    const clash = employees.find((e) => e.pin === draft.pin && e.id !== draft.id);
    if (clash) return flash(`${clash.name} already uses that PIN`, "out");
    let next;
    if (draft.id) next = employees.map((e) => (e.id === draft.id ? draft : e));
    else next = [...employees, { ...draft, id: uid() }];
    await saveEmployees(next);
    setDraft(null);
    flash("Roster saved");
  };

  const toggle = async (emp) => {
    await saveEmployees(
      employees.map((e) => (e.id === emp.id ? { ...e, active: e.active === false } : e))
    );
  };

  return (
    <div className="pane">
      <div className="rosterHead">
        <h2 className="paneTitle">Who works here</h2>
        <button className="btn primary" onClick={() => setDraft({ ...blank })}>
          Add someone
        </button>
      </div>

      {employees.length === 0 ? (
        <p className="muted pad">Nobody yet. Add your first technician.</p>
      ) : (
        <ul className="rosterList">
          {employees.map((e) => (
            <li key={e.id} className={e.active === false ? "off" : ""}>
              <div className="rosterMain">
                <strong>{e.name}</strong>
                <span>{e.role || "Technician"}</span>
              </div>
              <div className="rosterMeta">
                <span className="pinMask">PIN ••••</span>
                {e.rate ? <span>${e.rate}/hr</span> : null}
              </div>
              <div className="rosterActs">
                <button className="btn tiny" onClick={() => setDraft({ ...e })}>
                  Edit
                </button>
                <button className="btn tiny" onClick={() => toggle(e)}>
                  {e.active === false ? "Bring back" : "Set inactive"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <div className="overlay">
          <div className="editCard">
            <button className="closeX" onClick={() => setDraft(null)} aria-label="Close">
              ✕
            </button>
            <h2 className="editTitle">{draft.id ? "Edit person" : "Add someone"}</h2>
            <label className="fld">
              <span>Name</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="First and last"
              />
            </label>
            <label className="fld">
              <span>Job</span>
              <input
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                placeholder="Lube tech, brake tech, service writer…"
              />
            </label>
            <div className="fldRow">
              <label className="fld">
                <span>PIN</span>
                <input
                  value={draft.pin}
                  inputMode="numeric"
                  onChange={(e) =>
                    setDraft({ ...draft, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })
                  }
                  placeholder="4 digits"
                />
              </label>
              <label className="fld">
                <span>Hourly rate (optional)</span>
                <input
                  value={draft.rate}
                  inputMode="decimal"
                  onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
                  placeholder="24.00"
                />
              </label>
            </div>
            <button className="btn primary lg full" onClick={save}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
