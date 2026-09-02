/* ---------- day bar (shop hours timeline) ---------- */
export function DayBar({ cfg, sessions, now }) {
  const start = new Date();
  start.setHours(cfg.openHour, 0, 0, 0);
  const end = new Date();
  end.setHours(cfg.closeHour, 0, 0, 0);
  const span = end - start;
  if (span <= 0) return null;
  const segs = [];
  sessions.forEach((s, i) => {
    const a = Math.max(s.start, start.getTime());
    const b = Math.min(s.end != null ? s.end : now, end.getTime());
    if (b > a) {
      segs.push({
        key: `w${i}`,
        left: ((a - start.getTime()) / span) * 100,
        width: ((b - a) / span) * 100,
        kind: "work",
      });
    }
    [
      ["meal", s.meals || []],
      ["rest", s.rests || []],
    ].forEach(([kind, list]) => {
      list.forEach((br, j) => {
        const ba = Math.max(br.start, start.getTime());
        const bb = Math.min(br.end, end.getTime());
        if (bb > ba)
          segs.push({
            key: `${kind}${i}-${j}`,
            left: ((ba - start.getTime()) / span) * 100,
            width: ((bb - ba) / span) * 100,
            kind,
          });
      });
    });
  });
  const nowPct = ((now - start.getTime()) / span) * 100;
  return (
    <span className="daybar">
      <span className="daybarTrack" />
      {segs.map((s) => (
        <span
          key={s.key}
          className={`daybarSeg ${s.kind}`}
          style={{ left: `${s.left}%`, width: `${Math.max(s.width, 0.6)}%` }}
        />
      ))}
      {nowPct >= 0 && nowPct <= 100 && (
        <span className="daybarNow" style={{ left: `${nowPct}%` }} />
      )}
      <span className="daybarEnds">
        <em>{cfg.openHour % 12 || 12}a</em>
        <em>{cfg.closeHour > 12 ? cfg.closeHour - 12 : cfg.closeHour}p</em>
      </span>
    </span>
  );
}
