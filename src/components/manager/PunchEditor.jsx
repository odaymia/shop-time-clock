import { useState } from "react";
import { uid } from "../../lib/ids.js";
import { dayKey, fmtTimeInput, ym } from "../../lib/time.js";

export function PunchEditor({ ev, months, updateEvents, onClose, flash }) {
  const d = new Date(ev.ts);
  const [date, setDate] = useState(dayKey(d));
  const [time, setTime] = useState(fmtTimeInput(d));
  const [type, setType] = useState(ev.type);

  const save = async () => {
    const [y, mo, da] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const ts = new Date(y, mo - 1, da, hh, mm, 0, 0).getTime();
    const newKey = ym(new Date(ts));
    const oldKey = ym(new Date(ev.ts));

    if (ev.isNew) {
      const list = [...(months[newKey] || []), { id: uid(), empId: ev.empId, type, ts, edited: true }];
      await updateEvents(newKey, list);
    } else if (newKey === oldKey) {
      const list = (months[oldKey] || []).map((x) =>
        x.id === ev.id ? { ...x, ts, type, edited: true } : x
      );
      await updateEvents(oldKey, list);
    } else {
      await updateEvents(oldKey, (months[oldKey] || []).filter((x) => x.id !== ev.id));
      await updateEvents(newKey, [...(months[newKey] || []), { ...ev, ts, type, edited: true }]);
    }
    flash("Punch saved");
    onClose();
  };

  return (
    <div className="overlay">
      <div className="editCard">
        <button className="closeX" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="editTitle">{ev.isNew ? "Add a punch" : "Fix a punch"}</h2>
        <label className="fld">
          <span>What kind</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="in">Clock in</option>
            <option value="out">Clock out</option>
            <option value="mealStart">Lunch start</option>
            <option value="mealEnd">Lunch end</option>
            <option value="restStart">Rest break start</option>
            <option value="restEnd">Rest break end</option>
          </select>
        </label>
        <label className="fld">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="fld">
          <span>Time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <button className="btn primary lg full" onClick={save}>
          Save punch
        </button>
        <p className="setupNote">Edited punches are marked so you can spot them later.</p>
      </div>
    </div>
  );
}
