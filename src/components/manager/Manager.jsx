import { useState } from "react";
import { Roster } from "./Roster.jsx";
import { ScheduleBuilder } from "./ScheduleBuilder.jsx";
import { Settings } from "./Settings.jsx";
import { Timecards } from "./Timecards.jsx";

/* ---------- manager ---------- */
export function Manager({
  cfg,
  employees,
  months,
  loadMonth,
  updateEvents,
  saveCfg,
  saveEmployees,
  onExit,
  flash,
  now,
}) {
  const [tab, setTab] = useState("timecards");
  /* Schedule clipboard lives here so it survives switching tabs. */
  const [clip, setClip] = useState(null);
  return (
    <div className="mgr">
      <header className="mgrBar">
        <div className="mgrTabs">
          {[
            ["timecards", "Timecards"],
            ["schedule", "Schedule"],
            ["roster", "Roster"],
            ["settings", "Settings"],
          ].map(([k, label]) => (
            <button
              key={k}
              className={`mgrTab ${tab === k ? "on" : ""}`}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="btn ghost" onClick={onExit}>
          Back to the clock
        </button>
      </header>

      {tab === "timecards" && (
        <Timecards
          cfg={cfg}
          employees={employees}
          months={months}
          loadMonth={loadMonth}
          updateEvents={updateEvents}
          now={now}
          flash={flash}
        />
      )}
      {tab === "schedule" && (
        <ScheduleBuilder cfg={cfg} employees={employees} flash={flash} clip={clip} setClip={setClip} />
      )}
      {tab === "roster" && (
        <Roster employees={employees} saveEmployees={saveEmployees} flash={flash} cfg={cfg} />
      )}
      {tab === "settings" && <Settings cfg={cfg} saveCfg={saveCfg} flash={flash} />}
    </div>
  );
}
