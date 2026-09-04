import { useState, useEffect, useRef, useCallback } from "react";
import { Styles } from "./Styles.jsx";
import { ActionSheet } from "./components/ActionSheet.jsx";
import { BreakAttest } from "./components/BreakAttest.jsx";
import { DayBar } from "./components/DayBar.jsx";
import { Keypad } from "./components/Keypad.jsx";
import { MySchedule } from "./components/MySchedule.jsx";
import { ReviewSheet } from "./components/ReviewSheet.jsx";
import { Setup } from "./components/Setup.jsx";
import { Toast } from "./components/Toast.jsx";
import { Manager } from "./components/manager/Manager.jsx";
import { useCamera } from "./hooks/useCamera.js";
import { DEFAULT_CFG } from "./lib/config.js";
import { uid } from "./lib/ids.js";
import { CFG_KEY, EMP_KEY, attestKeyFor, photoKeyFor, punchKey, signKeyFor } from "./lib/keys.js";
import { MEAL_START, breakCompliance, buildSessions, isLastDayOfPeriod, nextBreakDue, periodEnd, periodSummary, sessionWorkedMs } from "./lib/payroll.js";
import { addDays, dayKey, fmtDateLong, fmtTime, hoursText, startOfWeek, ym } from "./lib/time.js";
import { cloud, purgePhotos, sGet, sSet, storageReady } from "./storage/index.js";

/* ---------- main ---------- */
export default function TimeClock() {
  const [ready, setReady] = useState(false);
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [employees, setEmployees] = useState([]);
  const [months, setMonths] = useState({}); // { 'YYYY-MM': [events] }
  const monthsRef = useRef({}); // same data, readable immediately after a write
  const [now, setNow] = useState(Date.now());
  const [screen, setScreen] = useState("kiosk"); // setup | kiosk | manager
  const [pinFor, setPinFor] = useState(null); // employee object
  const [managerPin, setManagerPin] = useState(false);
  const [pinErr, setPinErr] = useState("");
  const [actionFor, setActionFor] = useState(null);
  const [review, setReview] = useState(null);
  const [breakAsk, setBreakAsk] = useState(null);
  const [showSchedule, setShowSchedule] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  /* load */
  useEffect(() => {
    (async () => {
      await storageReady();
      const c = await sGet(CFG_KEY, null);
      const e = await sGet(EMP_KEY, []);
      const thisM = ym(new Date());
      const prevM = ym(addDays(new Date(), -35));
      const m = {};
      m[thisM] = await sGet(punchKey(thisM), []);
      if (prevM !== thisM) m[prevM] = await sGet(punchKey(prevM), []);
      const merged = c ? { ...DEFAULT_CFG, ...c } : DEFAULT_CFG;
      /* older saves used a paidMeal boolean */
      if (c && c.mealPay == null) merged.mealPay = c.mealPaid ? "always" : "discretionary";
      delete merged.mealPaid;
      delete merged.mealOnDuty;
      setCfg(merged);
      setEmployees(e || []);
      monthsRef.current = m;
      setMonths(m);
      setScreen(c && c.managerPin ? "kiosk" : "setup");
      setReady(true);
      purgePhotos(merged.photoRetentionDays);
    })();
  }, []);

  /* another device changed something: re-read what we hold in state */
  useEffect(
    () =>
      cloud.subscribe(async (e) => {
        if (e.type !== "data") return;
        const keys = e.keys || [];
        if (keys.includes(CFG_KEY)) {
          const c = await sGet(CFG_KEY, null);
          if (c) {
            const merged = { ...DEFAULT_CFG, ...c };
            setCfg(merged);
            setScreen((s) => (s === "setup" && merged.managerPin ? "kiosk" : s));
          }
        }
        if (keys.includes(EMP_KEY)) setEmployees(await sGet(EMP_KEY, []));
        const months = keys
          .filter((k) => k.startsWith("gac:punches:"))
          .map((k) => k.slice("gac:punches:".length))
          .filter((m) => monthsRef.current[m]);
        if (months.length) {
          const next = { ...monthsRef.current };
          for (const m of months) next[m] = await sGet(punchKey(m), []);
          monthsRef.current = next;
          setMonths(next);
        }
      }),
    []
  );

  /* tick */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const cam = useCamera(cfg.photos);
  const keepCam = cfg.photos && cfg.cameraKeepOn !== false;
  /* A Home Screen web app on iPadOS re-asks for the camera every time it's
     opened. Holding it open means one prompt per launch instead of one per
     punch. The kiosk footer shows a live indicator while it's on. */
  useEffect(() => {
    if (keepCam && ready && screen !== "setup") cam.start();
    if (!keepCam) cam.stop();
  }, [keepCam, ready, screen]); // eslint-disable-line
  const releaseCam = () => {
    if (!keepCam) cam.stop();
  };

  const flash = useCallback((text, tone) => {
    setToast({ text, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadMonth = useCallback(
    async (key) => {
      if (months[key]) return months[key];
      const data = await sGet(punchKey(key), []);
      monthsRef.current = { ...monthsRef.current, [key]: data };
      setMonths(monthsRef.current);
      return data;
    },
    [months]
  );

  const allEvents = useCallback(() => {
    return Object.values(months).flat();
  }, [months]);

  const eventsFor = useCallback(
    (empId) => allEvents().filter((e) => e.empId === empId),
    [allEvents]
  );

  const addEvent = useCallback(
    async (empId, type, ts, photo, payload) => {
      const at = ts || Date.now();
      const key = ym(new Date(at));
      const existing = months[key] || (await sGet(punchKey(key), []));
      const ev = { id: uid(), empId, type, ts: at };
      if (payload) ev.payload = payload;
      if (photo) {
        const pk = photoKeyFor(at, ev.id);
        const ok = await sSet(pk, photo);
        if (ok) ev.photoKey = pk;
      }
      const next = [...existing, ev];
      monthsRef.current = { ...monthsRef.current, [key]: next };
      setMonths(monthsRef.current);
      await sSet(punchKey(key), next);
      return ev;
    },
    [months]
  );

  const updateEvents = useCallback(async (key, list) => {
    monthsRef.current = { ...monthsRef.current, [key]: list };
    setMonths(monthsRef.current);
    await sSet(punchKey(key), list);
  }, []);

  const saveCfg = useCallback(async (next) => {
    setCfg(next);
    await sSet(CFG_KEY, next);
  }, []);
  const saveEmployees = useCallback(async (next) => {
    setEmployees(next);
    await sSet(EMP_KEY, next);
  }, []);

  /* status */
  const sessionsToday = useCallback(
    (empId) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const evs = eventsFor(empId).filter((e) => e.ts >= start.getTime());
      return buildSessions(evs, cfg);
    },
    [eventsFor, cfg]
  );

  const statusOf = useCallback(
    (empId) => {
      const evs = eventsFor(empId).sort((a, b) => a.ts - b.ts);
      const last = evs[evs.length - 1];
      if (!last || last.type === "out") return { state: "out", since: null };
      if (MEAL_START.includes(last.type)) return { state: "meal", since: last.ts };
      if (last.type === "restStart") return { state: "rest", since: last.ts };
      const sessions = buildSessions(evs, cfg);
      const open = sessions.find((s) => s.open);
      return { state: "in", since: open ? open.start : last.ts };
    },
    [eventsFor, cfg]
  );

  const dueFor = useCallback(
    (empId) => {
      const open = sessionsToday(empId).find((s) => s.open);
      return open ? nextBreakDue(open, cfg, now) : null;
    },
    [sessionsToday, cfg, now]
  );

  const todayMs = useCallback(
    (empId) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const evs = eventsFor(empId).filter((e) => e.ts >= start.getTime());
      const sessions = buildSessions(evs, cfg);
      return sessions.reduce((a, s) => a + sessionWorkedMs(s, cfg, now), 0);
    },
    [eventsFor, cfg, now]
  );

  /* punch flow */
  const handleEmployeeTap = (emp) => {
    setPinErr("");
    setPinFor(emp);
    cam.start(); // warm the camera up while they type their PIN
  };
  const closePunchFlow = () => {
    setPinFor(null);
    setActionFor(null);
    setShowSchedule(null);
    setPinErr("");
    releaseCam();
  };
  const submitEmployeePin = (v) => {
    if (!pinFor) return;
    if (v !== pinFor.pin) {
      setPinErr("That PIN doesn't match. Try again.");
      return;
    }
    setPinErr("");
    setActionFor(pinFor);
    setPinFor(null);
  };
  const doPunch = async (type, payload) => {
    const emp = actionFor;
    const shot = cfg.photos ? cam.capture() : null;
    if (cfg.photos && cfg.photoRequired && !shot) {
      flash("Camera isn't working — get a manager to punch you in", "out");
      return;
    }
    setActionFor(null);
    releaseCam();
    const ev = await addEvent(emp.id, type, null, shot, payload);
    const t = fmtTime(new Date(ev.ts));
    const label = {
      in: `${emp.name} clocked in at ${t}`,
      out: `${emp.name} clocked out at ${t}`,
      mealStart: `${emp.name} started lunch at ${t}`,
      mealEnd: `${emp.name} back from lunch at ${t}`,
      restStart: `${emp.name} on rest break at ${t}`,
      restEnd: `${emp.name} back from rest break at ${t}`,
    }[type];
    flash(label, type === "out" ? "out" : "in");

    if (type === "out") {
      const shown = await checkBreaks(emp, ev);
      if (shown) return; // period review runs after the break questions
    }
    if (cfg.attestation) await maybeReview(emp, type, ev);
  };

  /* Ask about breaks only when the day actually fell short. */
  const checkBreaks = useCallback(
    async (emp, ev) => {
      if (!cfg.breakRules) return false;
      const dStart = new Date(ev.ts);
      dStart.setHours(0, 0, 0, 0);
      const evs = Object.values(monthsRef.current)
        .flat()
        .filter((x) => x.empId === emp.id && x.ts >= dStart.getTime());
      const sessions = buildSessions(evs, cfg);
      if (!sessions.length) return false;
      const comp = breakCompliance(sessions, cfg, Date.now(), null, emp);
      const needs = (comp.meal1 && !comp.meal1.ok) || comp.restsOwed > comp.restsTaken;
      if (!needs) return false;
      setBreakAsk({ emp, comp, day: dayKey(dStart), ev });
      return true;
    },
    [cfg]
  );

  const submitBreakAttest = async (answers) => {
    if (!breakAsk) return;
    const { emp, day, ev } = breakAsk;
    await addEvent(emp.id, "breakAttest", ev.ts + 1, null, {
      day,
      meal1: answers.meal1 || null,
      rest: answers.rest || null,
      note: answers.note || "",
    });
    setBreakAsk(null);
    const owed = answers.meal1 === "denied" || answers.rest === "denied";
    flash(
      owed ? "Logged — an hour of premium pay was flagged for you" : "Thanks, logged",
      owed ? "out" : "in"
    );
    if (cfg.attestation) await maybeReview(emp, "out", ev);
  };

  /* Sign-off is due when someone clocks out on the last day of the pay period.
     If they miss it, we catch them at the next punch instead of losing it. */
  const maybeReview = useCallback(
    async (emp, type, ev) => {
      const when = new Date(ev.ts);
      let target = null;

      if (type === "out" && isLastDayOfPeriod(cfg, when)) {
        target = startOfWeek(when, cfg.weekStart);
      } else {
        const prior = startOfWeek(addDays(when, -7), cfg.weekStart);
        const priorEnd = addDays(prior, 7).getTime();
        if (when.getTime() >= priorEnd) target = prior;
      }
      if (!target) return;

      const key = attestKeyFor(dayKey(target), emp.id);
      const already = await sGet(key, null);
      if (already) return;

      // read from the ref, not state — the clock-out that triggered this
      // review was written milliseconds ago and must be included
      const evs = Object.values(monthsRef.current)
        .flat()
        .filter((x) => x.empId === emp.id);
      const summary = periodSummary(evs, cfg, target, Date.now());
      if (summary.totals.total === 0) return;

      setReview({ emp, periodStartDate: target, summary, key });
    },
    [cfg]
  );

  const submitReview = async ({ agreed, signature, note }) => {
    if (!review) return;
    const { emp, periodStartDate, summary, key } = review;
    const pStart = dayKey(periodStartDate);
    const record = {
      empId: emp.id,
      empName: emp.name,
      periodStart: pStart,
      periodEnd: dayKey(periodEnd(cfg, periodStartDate)),
      signedAt: Date.now(),
      agreed,
      note: note || "",
      totals: summary.totals,
      dayHours: summary.rows.map((r) => ({ d: dayKey(r.date), h: r.hours })),
    };
    if (signature) {
      const sk = signKeyFor(pStart, emp.id);
      const ok = await sSet(sk, signature);
      if (ok) record.signatureKey = sk;
    }
    await sSet(key, record);
    setReview(null);
    flash(
      agreed ? "Signed — thanks, hours confirmed" : "Sent to your manager for review",
      agreed ? "in" : "out"
    );
  };

  if (!ready) {
    return (
      <div className="root">
        <Styles />
        <div className="bootWrap">
          <div className="bootPulse" />
          <p className="bootTxt">Opening the shop…</p>
        </div>
      </div>
    );
  }

  if (screen === "setup") {
    return (
      <div className="root">
        <Styles />
        <Setup
          cfg={cfg}
          onDone={async (next) => {
            await saveCfg(next);
            setScreen("kiosk");
          }}
        />
      </div>
    );
  }

  if (screen === "manager") {
    return (
      <div className="root">
        <Styles />
        <Manager
          cfg={cfg}
          employees={employees}
          months={months}
          loadMonth={loadMonth}
          updateEvents={updateEvents}
          saveCfg={saveCfg}
          saveEmployees={saveEmployees}
          onExit={() => setScreen("kiosk")}
          flash={flash}
          now={now}
        />
        <Toast text={toast?.text} tone={toast?.tone} />
      </div>
    );
  }

  const active = employees.filter((e) => e.active !== false);
  const nowDate = new Date(now);

  /* PIN-only home screen: nobody's name is on the wall until they've
     entered their PIN. The manager PIN on the same pad opens the office. */
  const pinMode = cfg.kioskMode === "pin";
  const submitKioskPin = (v) => {
    if (v === cfg.managerPin) {
      setPinErr("");
      setScreen("manager");
      return;
    }
    const emp = active.find((e) => e.pin === v);
    if (!emp) {
      setPinErr("That PIN doesn't match anyone. Try again.");
      return;
    }
    setPinErr("");
    setActionFor(emp);
  };

  return (
    <div className="root">
      <Styles />

      <header className="bar">
        <div className="barLeft">
          <h1 className="shopName">{cfg.shopName}</h1>
          <p className="barDate">{fmtDateLong(nowDate)}</p>
        </div>
        <div className="barRight">
          <div className="bigClock">{fmtTime(nowDate)}</div>
          <div className="onNow">
            {active.filter((e) => statusOf(e.id).state !== "out").length} on the clock
          </div>
        </div>
      </header>

      {cfg.breakRules &&
        (() => {
          const alerts = active
            .map((e) => ({ emp: e, due: dueFor(e.id) }))
            .filter(
              (a) =>
                a.due &&
                (a.due.kind === "meal1" || a.due.kind === "meal2") &&
                a.due.remaining < cfg.breakReminderMin * 60000
            )
            .sort((a, b) => a.due.remaining - b.due.remaining);
          if (!alerts.length) return null;
          return (
            <div className="floorAlert">
              {alerts.map(({ emp, due }) => (
                <span key={emp.id} className={`floorItem ${due.remaining < 0 ? "over" : ""}`}>
                  <strong>{emp.name.split(" ")[0]}</strong>
                  {due.remaining < 0
                    ? ` — lunch is past the legal cutoff of ${fmtTime(new Date(due.dueAt))}`
                    : ` — lunch due in ${Math.max(0, Math.round(due.remaining / 60000))} min`}
                </span>
              ))}
            </div>
          );
        })()}

      {active.length === 0 ? (
        <div className="empty">
          <h2>No one on the roster yet</h2>
          <p>Add your technicians and give each one a 4-digit PIN. Then they can punch in here.</p>
          <button className="btn primary lg" onClick={() => setManagerPin(true)}>
            Add your team
          </button>
        </div>
      ) : pinMode ? (
        <main className="pinStage">
          <Keypad
            inline
            title="Punch in or out"
            subtitle="Enter your 4-digit PIN"
            error={pinErr}
            onSubmit={submitKioskPin}
            onStart={cfg.photos ? () => cam.start() : undefined}
            cam={cfg.photos ? cam : null}
          />
        </main>
      ) : (
        <main className="grid">
          {active.map((emp) => {
            const st = statusOf(emp.id);
            const worked = todayMs(emp.id);
            const due = cfg.breakRules ? dueFor(emp.id) : null;
            return (
              <button
                key={emp.id}
                className={`tile ${st.state}`}
                onClick={() => handleEmployeeTap(emp)}
              >
                <span className="tileRule" />
                <span className="tileTop">
                  <span className="tileName">{emp.name}</span>
                  <span className="tileRole">{emp.role || "Technician"}</span>
                </span>

                <DayBar
                  cfg={cfg}
                  sessions={buildSessions(
                    eventsFor(emp.id).filter((e) => {
                      const s = new Date();
                      s.setHours(0, 0, 0, 0);
                      return e.ts >= s.getTime();
                    }),
                    cfg
                  )}
                  now={now}
                />

                <span className="tileBottom">
                  <span className={`pill ${st.state}`}>
                    {st.state === "in"
                      ? "On the clock"
                      : st.state === "meal"
                      ? "At lunch"
                      : st.state === "rest"
                      ? "Rest break"
                      : "Out"}
                  </span>
                  <span className="tileHrs">{hoursText(worked)} today</span>
                </span>

                {due && (
                  <span
                    className={`tileDue ${
                      due.kind === "onMeal" || due.kind === "onRest"
                        ? "timer"
                        : due.remaining < 0
                        ? "over"
                        : due.remaining < cfg.breakReminderMin * 60000
                        ? "soon"
                        : ""
                    }`}
                  >
                    {due.kind === "onMeal"
                      ? due.remaining > 0
                        ? `${Math.ceil(due.remaining / 60000)} min left of lunch`
                        : "Full lunch taken"
                      : due.kind === "onRest"
                      ? due.remaining > 0
                        ? `${Math.ceil(due.remaining / 60000)} min left of rest break`
                        : "Rest break complete"
                      : due.remaining < 0
                      ? `${due.label} — past ${fmtTime(new Date(due.dueAt))}`
                      : `${due.label} by ${fmtTime(new Date(due.dueAt))}`}
                  </span>
                )}
              </button>
            );
          })}
        </main>
      )}

      <footer className="foot">
        <button className="linkBtn" onClick={() => setManagerPin(true)}>
          Manager
        </button>
        <span className="footNote">
          {keepCam && cam.state === "live" && (
            <span className="camLive" title="The camera is ready. A photo is taken only when someone punches.">
              <span className="camLiveDot" /> Camera ready
            </span>
          )}
          {pinMode ? "Enter your PIN to punch in or out" : "Tap your name to punch in or out"}
        </span>
      </footer>

      {pinFor && (
        <Keypad
          title={pinFor.name}
          subtitle="Enter your 4-digit PIN"
          error={pinErr}
          onSubmit={submitEmployeePin}
          onCancel={closePunchFlow}
          cam={cfg.photos ? cam : null}
        />
      )}

      {managerPin && (
        <Keypad
          title="Manager"
          subtitle="Enter the manager PIN"
          error={pinErr}
          onSubmit={(v) => {
            if (v === cfg.managerPin) {
              setManagerPin(false);
              setPinErr("");
              setScreen("manager");
            } else {
              setPinErr("Wrong PIN.");
            }
          }}
          onCancel={() => {
            setManagerPin(false);
            setPinErr("");
          }}
        />
      )}

      {actionFor && (
        <ActionSheet
          emp={actionFor}
          status={statusOf(actionFor.id)}
          worked={todayMs(actionFor.id)}
          onPunch={doPunch}
          onCancel={closePunchFlow}
          cam={cfg.photos ? cam : null}
          due={cfg.breakRules ? dueFor(actionFor.id) : null}
          now={now}
          cfg={cfg}
          onSchedule={() => {
            setShowSchedule(actionFor);
            setActionFor(null);
            releaseCam();
          }}
        />
      )}

      {showSchedule && (
        <MySchedule
          emp={showSchedule}
          cfg={cfg}
          onClose={() => setShowSchedule(null)}
        />
      )}

      {breakAsk && (
        <BreakAttest
          emp={breakAsk.emp}
          comp={breakAsk.comp}
          onSubmit={submitBreakAttest}
          onSkip={() => setBreakAsk(null)}
        />
      )}

      {review && (
        <ReviewSheet
          emp={review.emp}
          cfg={cfg}
          summary={review.summary}
          periodStartDate={review.periodStartDate}
          onSubmit={submitReview}
          onDefer={() => setReview(null)}
        />
      )}

      <Toast text={toast?.text} tone={toast?.tone} />
    </div>
  );
}
