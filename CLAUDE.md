# Shop Time Clock

An iPad kiosk time clock for Genie Auto Center, an auto service shop in San Diego.
Techs punch in and out on a wall-mounted iPad. The manager runs timecards, builds
schedules, and exports hours for payroll.

Long term this becomes part of a custom quick lube operating system, eventually
sold as SaaS to other shops. Build accordingly: nothing hardcoded, everything
configurable, multi-shop from the start.

## Stack

Vite + React 18, plain JavaScript (no TypeScript yet). No server.

```
index.html                 Vite entry: meta tags, boot spinner, error banner
src/main.jsx               mounts the app, requests the screen wake lock
src/App.jsx                TimeClock root: state, punch flow, kiosk screen
src/Styles.jsx             the app stylesheet, rendered as a <style> block
src/lib/payroll.js         sessions, break rules, overtime, pay period — no UI
src/lib/schedule.js        scheduled-shift helpers
src/lib/time.js            date and duration formatting
src/lib/config.js          DEFAULT_CFG
src/lib/keys.js            storage key layout
src/storage/index.js       the storage module (sGet/sSet/sDel/sList, purgePhotos)
src/storage/indexeddb.js   IndexedDB backend with the window.storage shape
src/hooks/useCamera.js     front-camera capture
src/components/            employee-facing screens and shared UI
src/components/manager/    timecards, schedule builder, roster, settings
legacy/                    the pre-Vite single-file build, kept for reference
```

`src/lib/payroll.js` is pure functions and must stay that way: nothing in it
touches React, the DOM, or storage.

## Build and run

Requires Node 18+ and npm.

```
npm install        once, or after dependencies change
npm run dev        dev server with hot reload (http://localhost:5173)
npm run build      production build into dist/
npm run preview    serve the built dist/ locally to check it
npm run lint       ESLint over src/
```

Deploy by copying `dist/` to any HTTPS host; it is built with a relative base
so it works from a subfolder. Camera access needs HTTPS. On the iPad, open the
URL in Safari and add it to the Home Screen.

## What it does

- PIN punch in/out on a shared kiosk, one tile per employee
- Front camera photo captured with every punch (prevents buddy punching)
- California meal and rest period tracking with premium calculation
- End-of-pay-period hours review with an on-screen signature
- Weekly schedule builder; employees see only their own shifts
- Scheduled vs actual variance
- CSV export for payroll

## Storage

All data is local to the device. There is no server.

The app calls a small async key-value API: `get(key)`, `set(key, value)`,
`delete(key)`, `list(prefix)`. Inside a Claude artifact this is provided by
`window.storage`. In the standalone build it is shimmed over IndexedDB in
`src/storage/indexeddb.js`.

**Keep that abstraction.** Do not scatter IndexedDB or localStorage calls through
the app. There is one storage module; everything goes through it. When this moves
to a server, only that module changes.

Do not use localStorage for punch photos. A year of photos exceeds its quota.

Key layout:

```
gac:config                      shop settings
gac:employees                   roster
gac:punches:YYYY-MM             punch events, sharded by month
gac:photo:<ts>:<eventId>        punch photo, JPEG data URL, auto-expires
gac:signature:<weekStart>:<empId>   timecard signature, never auto-deleted
gac:attest:<weekStart>:<empId>      signed or disputed timecard record
gac:schedule:<weekStart>            one week of shifts
```

Punches are an append-only event log (`in`, `out`, `mealStart`, `mealEnd`,
`restStart`, `restEnd`, `breakAttest`). Shifts are derived from the log, never
stored. Keep it that way — editing a derived shift record instead of the
underlying punches is how timecards drift out of sync with reality.

## Payroll rules that must not be "simplified"

This is a California employer. These rules have money and legal exposure
attached. Do not refactor them into something cleaner without checking the
behavior still holds.

- Overtime: over 8 hours in a day at 1.5x, over 12 at 2x, over 40 straight-time
  hours in a week at 1.5x. The 7th-consecutive-day rule is NOT implemented and
  is flagged to the user in the UI.
- Meal period: required over 5 hours worked, must begin before the end of the
  5th hour, minimum 30 minutes. Waivable only when the day is 6 hours or less.
  Second meal required over 10 hours, waivable at 12 or under if the first was
  taken.
- Rest periods: 10 minutes paid per 4 hours "or major fraction thereof." The
  bands are: under 3.5 hours none, 3.5 to 6 one, over 6 to 10 two, over 10 to 14
  three, over 14 four. These are DLSE bands, not a rounding formula. These
  need tests; none exist yet.
- Premiums: one hour at the regular rate, capped at one meal premium and one
  rest premium per day. Premium pay is NOT hours worked and must never be added
  into the hours total or feed overtime.
- A paid meal period becomes hours worked, which pushes people into daily
  overtime earlier. Lunches can be paid individually at the manager's
  discretion; the flag lives on the `mealStart` event.
- Rounding may be applied to computed totals. The raw punch timestamp is always
  preserved so rounding can be turned off and true times recovered.

## Design rules

- The app must never block someone from working. Under *Brinker v. Superior
  Court* the employer's duty is to provide breaks, not police them. Prompt,
  remind, and record — never lock the clock.
- When a break is missed, ask the employee whether they chose to skip it or were
  prevented. That answer decides whether a premium is owed. Never assume.
- Never let a manager silently edit a punch to make hours look better. Edits are
  marked, and a signed timecard whose totals later changed shows as "Signed,
  changed."
- Employees see their own data only. The schedule view filters to one employee
  before rendering.
- PINs on a shared kiosk are convenience, not authentication. Never put pay
  rates, discipline notes, or anything sensitive behind a 4-digit PIN.

## UI

Dark shop-floor palette: asphalt background, amber signal accent, green for on
the clock, blue for rest breaks, red for problems. Large touch targets — techs
tap this with greasy hands. Tabular numerals for anything numeric.

Plain language throughout. It says "lunch" and "rest break," not "meal period"
and "rest period." No jargon on the employee-facing screens.

## Known gaps

- Data lives on one iPad with no sync or backup. Weekly CSV export is the only
  safety net. This is the most important thing to fix.
- No 7th-consecutive-day overtime.
- No automated tests. `src/lib/payroll.js` is pure and easy to test; start
  there.
- The stylesheet is a JSX component (`src/Styles.jsx`) rendered into the tree.
  It should become a plain `.css` file imported once from `main.jsx`.
