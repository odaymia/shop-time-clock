/* ---------- styles ---------- */
export function Styles() {
  return (
    <style>{`
:root {
  --asphalt:#12161c;
  --panel:#1a2029;
  --panel2:#212934;
  --line:#2e3743;
  --ink:#e9eef4;
  --muted:#8b98a8;
  --signal:#f2a310;
  --live:#3fb56a;
  --brk:#5aa7e0;
  --warn:#e2593f;
}
* { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
.root {
  min-height:100vh;
  background:var(--asphalt);
  color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-variant-numeric:tabular-nums;
  display:flex; flex-direction:column;
  padding:0;
}
button { font-family:inherit; cursor:pointer; }
input, select, textarea { font-family:inherit; font-size:17px; }

/* top bar */
.bar {
  display:flex; align-items:flex-end; justify-content:space-between;
  padding:22px 28px 18px;
  border-bottom:1px solid var(--line);
  background:linear-gradient(180deg,#171d25,#12161c);
}
.shopName { margin:0; font-size:26px; font-weight:650; letter-spacing:-0.02em; }
.barDate { margin:4px 0 0; color:var(--muted); font-size:15px; }
.barRight { text-align:right; }
.bigClock {
  font-size:52px; font-weight:300; letter-spacing:-0.03em; line-height:1;
  font-variant-numeric:tabular-nums;
}
.onNow { margin-top:6px; font-size:14px; color:var(--signal); }

/* grid */
.grid {
  flex:1;
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
  gap:16px;
  padding:24px 28px;
  align-content:start;
}
.tile {
  position:relative;
  text-align:left;
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:14px;
  padding:20px 20px 16px;
  color:inherit;
  display:flex; flex-direction:column; gap:14px;
  min-height:172px;
  transition:transform .08s ease, background .15s ease;
}
.tile:active { transform:scale(.985); background:var(--panel2); }
.tileRule {
  position:absolute; top:0; left:16px; right:16px; height:3px;
  background:var(--line); border-radius:0 0 3px 3px;
}
.tile.in .tileRule { background:var(--live); }
.tile.break .tileRule { background:var(--brk); }
.tileTop { display:flex; flex-direction:column; gap:3px; }
.tileName { font-size:22px; font-weight:600; letter-spacing:-0.01em; }
.tileRole { font-size:14px; color:var(--muted); }
.tileBottom { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.tileHrs { font-size:14px; color:var(--muted); }
.pill {
  font-size:13px; padding:5px 11px; border-radius:999px;
  border:1px solid var(--line); color:var(--muted);
}
.pill.in { color:var(--live); border-color:rgba(63,181,106,.4); background:rgba(63,181,106,.08); }
.pill.break { color:var(--brk); border-color:rgba(90,167,224,.4); background:rgba(90,167,224,.08); }

/* day bar */
.daybar { position:relative; display:block; height:22px; }
.daybarTrack {
  position:absolute; top:6px; left:0; right:0; height:6px;
  background:#161c24; border:1px solid var(--line); border-radius:3px;
}
.daybarSeg { position:absolute; top:7px; height:4px; border-radius:2px; }
.daybarSeg.work { background:var(--live); }
.daybarSeg.meal { background:var(--signal); }
.daybarSeg.rest { background:var(--brk); }
.daybarSeg.brk { background:var(--brk); }
.daybarNow { position:absolute; top:2px; width:1px; height:14px; background:var(--signal); }
.daybarEnds {
  position:absolute; top:16px; left:0; right:0;
  display:flex; justify-content:space-between;
  font-size:10px; color:#5c6774; font-style:normal;
}
.daybarEnds em { font-style:normal; }

/* footer */
.foot {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 28px 20px; border-top:1px solid var(--line);
}
.footNote { color:#59636f; font-size:14px; display:flex; align-items:center; gap:18px; }
.camLive { display:inline-flex; align-items:center; gap:7px; color:var(--live); }
.camLiveDot { width:8px; height:8px; border-radius:50%; background:var(--live); box-shadow:0 0 0 3px rgba(63,181,106,.18); }
.linkBtn {
  background:none; border:1px solid var(--line); color:var(--muted);
  padding:10px 18px; border-radius:9px; font-size:15px;
}
.linkBtn:active { background:var(--panel); }

/* empty */
.empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:40px; text-align:center; }
.empty h2 { margin:0; font-size:26px; font-weight:600; }
.empty p { margin:0; color:var(--muted); max-width:46ch; line-height:1.5; }

/* buttons */
.btn {
  border-radius:10px; border:1px solid var(--line);
  background:var(--panel); color:var(--ink);
  padding:11px 18px; font-size:15px;
}
.btn:active { background:var(--panel2); }
.btn.primary { background:var(--signal); border-color:var(--signal); color:#1a1300; font-weight:600; }
.btn.ghost { background:transparent; color:var(--muted); }
.btn.tiny { padding:7px 12px; font-size:13px; }
.btn.tiny.primary { color:#1a1300; }
.btn.danger { color:var(--warn); border-color:rgba(226,89,63,.35); }
.btn.lg { padding:16px 26px; font-size:18px; }
.btn.full { width:100%; margin-top:8px; }
.btn:disabled { opacity:.35; }

/* overlay + keypad */
.overlay {
  position:fixed; inset:0; background:rgba(8,11,15,.86);
  display:flex; align-items:center; justify-content:center; padding:20px; z-index:50;
  backdrop-filter:blur(3px);
}
.pinCard, .actCard, .editCard, .csvCard {
  position:relative;
  background:var(--panel); border:1px solid var(--line); border-radius:18px;
  padding:30px; width:100%; max-width:420px;
}
.csvCard { max-width:680px; }
.editCard { max-width:520px; }
.closeX {
  position:absolute; top:14px; right:14px; width:40px; height:40px;
  border-radius:10px; border:1px solid var(--line); background:transparent;
  color:var(--muted); font-size:16px;
}
.pinStage { flex:1; display:flex; align-items:center; justify-content:center; padding:24px; }
.pinCard.inline { max-width:460px; }
.pinName { margin:0; font-size:26px; text-align:center; font-weight:600; }
.pinSub { margin:6px 0 0; text-align:center; color:var(--muted); font-size:15px; }
.dots { display:flex; gap:14px; justify-content:center; margin:22px 0 6px; }
.dot { width:15px; height:15px; border-radius:50%; border:1.5px solid #3d4854; }
.dot.on { background:var(--signal); border-color:var(--signal); }
.shake { animation:shake .3s; }
@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px)} 75%{transform:translateX(7px)} }
.pinErr { color:var(--warn); text-align:center; font-size:14px; margin:6px 0 0; min-height:20px; }
.pinErrHold { min-height:20px; margin:6px 0 0; }
.keys { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:18px; }
.key {
  height:72px; font-size:26px; font-weight:400;
  background:var(--panel2); border:1px solid var(--line); color:var(--ink); border-radius:12px;
}
.key:active { background:#2b3542; }
.keyDel { font-size:22px; color:var(--muted); }

/* action sheet */
.actName { margin:0; text-align:center; font-size:28px; font-weight:600; }
.actMeta { margin:8px 0 22px; text-align:center; color:var(--muted); font-size:15px; }
.actBtns { display:flex; flex-direction:column; gap:12px; }
.bigAct {
  height:76px; border-radius:14px; font-size:21px; font-weight:600;
  border:1px solid var(--line); background:var(--panel2); color:var(--ink);
}
.bigAct.in { background:var(--live); border-color:var(--live); color:#04180c; }
.bigAct.out { background:var(--signal); border-color:var(--signal); color:#1a1300; }
.bigAct.brk { background:transparent; color:var(--brk); border-color:rgba(90,167,224,.4); }

/* camera */
.cam {
  position:relative; margin:0 auto 18px; overflow:hidden;
  background:#0d1116; border:1px solid var(--line); border-radius:14px;
  display:flex; align-items:center; justify-content:center;
}
.cam.sm { width:150px; height:112px; }
.cam.lg { width:230px; height:172px; }
.cam.live { border-color:rgba(63,181,106,.45); }
.camVid { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); display:block; }
.cam:not(.live) .camVid { opacity:0; }
.camFallback {
  position:absolute; inset:0; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:8px; padding:12px;
  text-align:center; color:var(--muted); font-size:12px; line-height:1.4;
}
.camIcon { font-size:20px; color:#3d4854; }
.camDot {
  position:absolute; top:9px; right:9px; width:9px; height:9px; border-radius:50%;
  background:var(--live); box-shadow:0 0 0 3px rgba(63,181,106,.2);
}
.camNote { margin:16px 0 0; text-align:center; font-size:13px; color:var(--muted); }

.noteBox {
  padding:14px 16px; margin:0 0 16px; border-radius:10px; font-size:13.5px; line-height:1.55;
  background:var(--asphalt); border:1px solid var(--line); color:var(--muted);
}
.noteBox.warn {
  background:rgba(226,89,63,.09); border-color:rgba(226,89,63,.35); color:#f0a08d;
}
.payTag {
  font-size:12px; padding:5px 11px; border-radius:999px; white-space:nowrap;
  border:1px dashed var(--line); background:transparent; color:var(--muted);
}
.payTag.on { border-style:solid; border-color:rgba(63,181,106,.45); color:var(--live); background:rgba(63,181,106,.08); }
.payTag.static { cursor:default; }
.paidSummary {
  margin:16px 0 0; padding:13px 16px; border-radius:10px; font-size:14px; line-height:1.5;
  background:rgba(63,181,106,.07); border:1px solid rgba(63,181,106,.28); color:var(--live);
}

/* schedule variance */
.viewToggle { display:flex; gap:6px; margin-bottom:16px; }
.varCell { padding:9px 8px !important; }
.varNum { display:block; font-size:15px; font-weight:600; }
.varCell em { display:block; font-style:normal; font-size:11px; color:#5c6774; margin-top:2px; }
.varCell.over .varNum { color:var(--signal); }
.varCell.under .varNum { color:var(--brk); }
.varCell.noshow { background:rgba(226,89,63,.09); }
.varCell.noshow .varNum { color:var(--warn); }
.varCell.unscheduled { background:rgba(242,163,16,.08); }
.varCell.unscheduled .varNum { color:var(--signal); }
.varSummary {
  margin:16px 0 0; padding:14px 16px; border-radius:10px; font-size:14.5px; line-height:1.5;
  background:var(--panel); border:1px solid var(--line); color:var(--muted);
}
.varSummary.over { color:var(--signal); border-color:rgba(242,163,16,.32); background:rgba(242,163,16,.07); }
.varSummary.under { color:var(--brk); border-color:rgba(90,167,224,.3); background:rgba(90,167,224,.07); }
.varList { list-style:none; margin:18px 0 0; padding:0; display:flex; flex-direction:column; gap:10px; }
.varList li { background:var(--asphalt); border:1px solid var(--line); border-radius:11px; padding:14px 16px; }
.varList li.noshow { border-color:rgba(226,89,63,.35); }
.varList li.unscheduled { border-color:rgba(242,163,16,.32); }
.varHead { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px; }
.varHead strong { font-size:15px; }
.varHead span { font-size:14px; color:var(--muted); }
.varHead span.ot { color:var(--signal); }
.varLines p { margin:0 0 3px; font-size:13.5px; color:var(--muted); }
.varLines em { font-style:normal; display:inline-block; width:78px; color:#5c6774; }
.varNotes { margin:9px 0 0; padding-left:18px; font-size:13px; color:var(--signal); line-height:1.6; }
.fillRow { display:flex; align-items:center; gap:12px; margin-top:10px; font-size:13px; color:var(--muted); line-height:1.5; }
.fillRow .btn { flex-shrink:0; }

/* schedule */
.postState {
  padding:12px 15px; margin-bottom:16px; border-radius:10px;
  font-size:13.5px; line-height:1.5; color:var(--muted);
  background:var(--panel); border:1px solid var(--line);
}
.postState.live { color:var(--live); border-color:rgba(63,181,106,.3); background:rgba(63,181,106,.07); }
table.sched th em { display:block; font-style:normal; font-size:11px; color:#5c6774; margin-top:2px; }
table.sched td.cellPad { padding:6px; }
.schedCell {
  width:100%; min-height:56px; border-radius:9px; padding:8px 6px;
  background:transparent; border:1px dashed var(--line); color:var(--muted);
  display:flex; flex-direction:column; gap:3px; align-items:center; justify-content:center;
  font-size:13px;
}
.schedCell.on {
  background:rgba(63,181,106,.09); border:1px solid rgba(63,181,106,.35);
  color:var(--ink); font-weight:600;
}
.schedCell em { font-style:normal; font-size:11px; color:var(--muted); font-weight:400; }
.addMark { font-size:20px; color:#3d4854; }
.coverRow td { border-top:2px solid var(--line); font-size:14px; color:var(--muted); }
.coverRow .stick { font-size:13px; color:var(--muted); font-weight:500; }
.schedWarn {
  margin-top:18px; padding:14px 16px; border-radius:10px; font-size:14px; line-height:1.55;
  background:rgba(242,163,16,.09); border:1px solid rgba(242,163,16,.32); color:var(--signal);
}
.schedWarn p { margin:0 0 6px; }
.schedWarn p:last-child { margin-bottom:0; }
.schedFoot { margin-top:22px; }
.presetRow { display:flex; gap:8px; flex-wrap:wrap; margin:14px 0 18px; }
.shiftPreview {
  margin:4px 0 16px; padding:12px 14px; border-radius:9px; font-size:14px;
  background:var(--asphalt); border:1px solid var(--line); color:var(--live);
}
.shiftPreview.bad { color:var(--warn); border-color:rgba(226,89,63,.35); }
.weekNav.tight { margin:4px 0 18px; justify-content:space-between; }
.weekTag { font-size:14px; color:var(--muted); }

.schedEmpty {
  padding:34px 20px; text-align:center; border-radius:12px;
  background:var(--asphalt); border:1px solid var(--line);
}
.schedEmpty p { margin:0 0 6px; font-size:17px; }
.schedEmpty span { font-size:14px; color:var(--muted); }
.myDays { list-style:none; margin:0; padding:0; }
.myDays li {
  display:grid; grid-template-columns:130px 1fr auto; gap:8px 14px; align-items:baseline;
  padding:15px 14px; border-radius:11px; margin-bottom:8px;
  background:var(--asphalt); border:1px solid var(--line);
}
.myDays li.off { opacity:.5; }
.myDays li.today { border-color:var(--signal); background:rgba(242,163,16,.07); }
.myDayName { font-size:16px; font-weight:600; }
.myDayName em { display:block; font-style:normal; font-size:12.5px; color:var(--muted); font-weight:400; margin-top:2px; }
.myTimes { font-size:19px; font-weight:600; }
.myTimes.offTxt { font-size:16px; font-weight:400; color:var(--muted); }
.myMeta { font-size:13px; color:var(--muted); text-align:right; }
.myNote { grid-column:1 / -1; font-size:13.5px; color:var(--brk); }
.todayTag {
  grid-column:3; font-size:11px; color:var(--signal);
  border:1px solid rgba(242,163,16,.4); border-radius:999px; padding:3px 9px;
}

/* break tracking */
.floorAlert {
  display:flex; flex-wrap:wrap; gap:10px 24px;
  padding:14px 28px; background:rgba(242,163,16,.09);
  border-bottom:1px solid rgba(242,163,16,.3);
}
.floorItem { font-size:15px; color:var(--signal); }
.floorItem strong { color:var(--ink); font-weight:600; }
.floorItem.over { color:#f0a08d; }
.tileDue {
  font-size:12.5px; color:var(--muted); padding-top:2px;
  border-top:1px solid var(--line); margin-top:-2px;
}
.tileDue.soon { color:var(--signal); }
.tileDue.over { color:#f0a08d; }
.tileDue.timer { color:var(--brk); }
.tile.meal .tileRule { background:var(--signal); }
.tile.rest .tileRule { background:var(--brk); }
.pill.meal { color:var(--signal); border-color:rgba(242,163,16,.4); background:rgba(242,163,16,.08); }
.pill.rest { color:var(--brk); border-color:rgba(90,167,224,.4); background:rgba(90,167,224,.08); }

.breakTimer {
  display:flex; flex-direction:column; align-items:center; gap:4px;
  padding:16px; margin-bottom:18px; border-radius:12px;
  background:var(--asphalt); border:1px solid var(--line);
}
.breakTimer strong { font-size:38px; font-weight:300; letter-spacing:-0.03em; }
.breakTimer span { font-size:13px; color:var(--muted); text-align:center; }
.breakTimer.short strong { color:var(--signal); }
.breakTimer.done strong { color:var(--live); }

.dueBanner {
  padding:12px 14px; margin-bottom:16px; border-radius:10px; font-size:14px; line-height:1.45;
  background:rgba(242,163,16,.1); border:1px solid rgba(242,163,16,.35); color:var(--signal);
}
.dueBanner.over { background:rgba(226,89,63,.1); border-color:rgba(226,89,63,.4); color:#f0a08d; }

.bigAct em { display:block; font-style:normal; font-size:12.5px; font-weight:400; opacity:.72; margin-top:3px; }
.bigAct.meal { background:var(--signal); border-color:var(--signal); color:#1a1300; }
.bigAct { height:auto; min-height:76px; padding:14px 18px; }
.shortWarn { display:flex; flex-direction:column; gap:11px; }
.shortWarn p {
  margin:0; padding:14px; border-radius:10px; font-size:14px; line-height:1.5;
  background:rgba(226,89,63,.1); border:1px solid rgba(226,89,63,.35); color:#f0a08d;
}

.attestBlock { margin-bottom:22px; }
.attestQ { margin:0 0 12px; font-size:16px; font-weight:600; }
.attestOpts { display:flex; flex-direction:column; gap:10px; }
.attestOpt {
  text-align:left; padding:15px 17px; border-radius:12px;
  background:var(--asphalt); border:1px solid var(--line); color:var(--ink);
  display:flex; flex-direction:column; gap:4px;
}
.attestOpt strong { font-size:16px; font-weight:600; }
.attestOpt span { font-size:13.5px; color:var(--muted); line-height:1.45; }
.attestOpt.on { border-color:var(--signal); background:rgba(242,163,16,.09); }
.disputeBox.short { min-height:84px; }

.flagList { list-style:none; margin:18px 0 0; padding:0; display:flex; flex-direction:column; gap:12px; }
.flagList li { background:var(--asphalt); border:1px solid var(--line); border-radius:12px; padding:15px 17px; }
.flagHead { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px; }
.flagHead span { font-size:13px; color:var(--muted); }
.flagIssues { margin:0 0 10px; padding-left:18px; font-size:14px; color:var(--signal); line-height:1.6; }
.flagAnswer { font-size:14px; color:var(--muted); line-height:1.55; }
.flagAnswer p { margin:0 0 4px; }
.flagAnswer.missing { color:#f0a08d; }
.flagNote { font-style:italic; color:var(--ink); margin-top:6px !important; }

/* end-of-period review */
.reviewCard {
  position:relative; background:var(--panel); border:1px solid var(--line);
  border-radius:18px; padding:28px; width:100%; max-width:620px;
  max-height:92vh; overflow-y:auto;
}
.reviewHead { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:20px; }
.reviewTitle { margin:0; font-size:25px; font-weight:600; letter-spacing:-0.02em; }
.reviewSub { margin:5px 0 0; color:var(--muted); font-size:15px; }
.reviewTotal { text-align:right; line-height:1.05; }
.reviewTotal strong { display:block; font-size:38px; font-weight:300; letter-spacing:-0.03em; }
.reviewTotal span { font-size:13px; color:var(--muted); }
.reviewDays { list-style:none; margin:0 0 16px; padding:0; border-top:1px solid var(--line); }
.reviewDays li {
  display:grid; grid-template-columns:88px 1fr auto 62px; gap:10px; align-items:center;
  padding:11px 2px; border-bottom:1px solid var(--line); font-size:15px;
}
.reviewDays li.off { color:#4c5663; }
.rdDay { color:var(--muted); font-size:14px; }
.rdPunch { font-size:14px; }
.rdBreak { font-size:12px; color:var(--brk); }
.rdHrs { text-align:right; font-weight:600; }
.reviewSplit { display:flex; gap:22px; flex-wrap:wrap; font-size:14px; color:var(--muted); margin-bottom:18px; }
.reviewSplit strong { color:var(--ink); font-size:16px; margin-left:4px; }
.reviewWarn {
  background:rgba(226,89,63,.1); border:1px solid rgba(226,89,63,.35);
  color:#f0a08d; padding:12px 14px; border-radius:10px; font-size:14px; margin:0 0 16px; line-height:1.5;
}
.reviewActs { display:flex; flex-direction:column; gap:11px; }
.linkBtn.wide { width:100%; margin-top:12px; }
.signLead { margin:0 0 18px; font-size:16px; line-height:1.55; }
.signFine { margin:14px 0 0; color:#5c6774; font-size:13px; line-height:1.5; }

/* signature pad */
.sigWrap { margin-bottom:18px; }
.sigPad {
  width:100%; height:170px; display:block; touch-action:none;
  background:#0d1116; border:1px solid var(--line); border-radius:12px;
  cursor:crosshair;
}
.sigBase { display:flex; align-items:center; justify-content:space-between; margin-top:8px; }
.sigX { color:#3d4854; font-size:13px; letter-spacing:-0.5px; overflow:hidden; white-space:nowrap; }
.sigImg { width:100%; border-radius:10px; border:1px solid var(--line); margin:16px 0 0; display:block; }
.sigSummary {
  display:flex; gap:18px; flex-wrap:wrap; margin:16px 0 0;
  padding:14px; background:var(--asphalt); border:1px solid var(--line);
  border-radius:10px; font-size:13px; color:var(--muted);
}
.sigSummary strong { color:var(--ink); font-size:15px; margin-left:5px; }
.disputeBox {
  background:var(--asphalt); border:1px solid var(--line); color:var(--ink);
  border-radius:10px; padding:14px; min-height:130px; width:100%; resize:vertical; line-height:1.5;
}
.disputeShow { margin-top:16px; }
.disputeLabel { margin:0 0 6px; font-size:13px; color:var(--muted); }
.disputeText {
  margin:0; padding:14px; background:var(--asphalt); border:1px solid rgba(226,89,63,.3);
  border-radius:10px; line-height:1.55; font-size:15px;
}
.sigTag {
  font-size:12px; padding:5px 10px; border-radius:999px;
  border:1px solid var(--line); background:transparent; color:var(--muted); white-space:nowrap;
}
.sigTag.ok { color:var(--live); border-color:rgba(63,181,106,.4); }
.sigTag.bad { color:var(--warn); border-color:rgba(226,89,63,.45); }
.sigTag.warnEdit { color:var(--signal); border-color:rgba(242,163,16,.45); }
.sigTag.none { color:#4c5663; }

/* punch photos */
.thumbBtn { padding:0; border:none; background:none; line-height:0; border-radius:8px; }
.thumb {
  width:56px; height:42px; object-fit:cover; border-radius:8px;
  border:1px solid var(--line); display:block;
}
.thumb.noPhoto {
  display:flex; align-items:center; justify-content:center;
  color:#4c5663; font-size:11px; background:#0d1116;
}
.zoomCard {
  position:relative; background:var(--panel); border:1px solid var(--line);
  border-radius:16px; padding:26px; max-width:440px; width:100%;
}
.zoomImg { width:100%; border-radius:12px; display:block; }
.zoomMeta { margin:14px 0 0; text-align:center; color:var(--muted); font-size:14px; }

/* toast */
.toast {
  position:fixed; left:50%; bottom:36px; transform:translateX(-50%);
  background:var(--live); color:#04180c; padding:16px 28px; border-radius:12px;
  font-size:18px; font-weight:600; z-index:80; box-shadow:0 10px 40px rgba(0,0,0,.5);
}
.toast.out { background:var(--signal); color:#1a1300; }

/* setup */
.setupWrap { flex:1; display:flex; align-items:center; justify-content:center; padding:24px; }
.setupCard { width:100%; max-width:460px; background:var(--panel); border:1px solid var(--line); border-radius:18px; padding:32px; }
.setupTitle { margin:0 0 8px; font-size:27px; font-weight:600; letter-spacing:-0.02em; }
.setupLead { margin:0 0 22px; color:var(--muted); line-height:1.5; font-size:15px; }
.setupNote { margin:14px 0 0; color:#5c6774; font-size:13px; line-height:1.5; }
.fld { display:flex; flex-direction:column; gap:7px; margin-bottom:16px; }
.fld > span { font-size:14px; color:var(--muted); }
.fld input, .fld select, .fld textarea {
  background:var(--asphalt); border:1px solid var(--line); color:var(--ink);
  border-radius:10px; padding:14px 14px; min-height:52px;
}
.fld input:focus, .fld select:focus { outline:2px solid var(--signal); outline-offset:1px; }
.fldRow { display:flex; gap:14px; }
.fldRow .fld { flex:1; }
.fldErr { color:var(--warn); font-size:14px; margin:0 0 10px; }

/* manager */
.mgr { flex:1; display:flex; flex-direction:column; }
.mgrBar {
  display:flex; align-items:center; justify-content:space-between;
  padding:16px 24px; border-bottom:1px solid var(--line); gap:12px;
}
.mgrTabs { display:flex; gap:6px; }
.mgrTab {
  background:transparent; border:1px solid transparent; color:var(--muted);
  padding:10px 18px; border-radius:9px; font-size:16px;
}
.mgrTab.on { color:var(--ink); border-color:var(--line); background:var(--panel); }
.pane { padding:22px 24px 40px; }
.paneTitle { margin:0 0 16px; font-size:21px; font-weight:600; }
.muted { color:var(--muted); }
.pad { padding:20px 0; }

/* timecards */
.weekNav { display:flex; align-items:center; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
.weekLabel { display:flex; flex-direction:column; gap:2px; min-width:180px; }
.weekLabel strong { font-size:17px; }
.weekLabel span { font-size:13px; color:var(--muted); }
.tableWrap { overflow-x:auto; border:1px solid var(--line); border-radius:12px; }
table.tc { width:100%; border-collapse:collapse; font-size:15px; }
table.tc th, table.tc td { padding:13px 12px; text-align:center; border-bottom:1px solid var(--line); white-space:nowrap; }
table.tc th { color:var(--muted); font-weight:500; font-size:13px; background:var(--panel); }
table.tc td.zero { color:#4c5663; }
table.tc td.hot { color:var(--signal); }
table.tc td.num { color:var(--ink); }
table.tc td.ot { color:var(--signal); }
table.tc td.tot { font-weight:700; }
.stick { text-align:left !important; position:sticky; left:0; background:var(--panel); z-index:2; }
.nameCell { font-weight:600; }
.warnDot { display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--warn); margin-left:8px; vertical-align:middle; }

.punches { margin-top:22px; background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:18px; }
.punchesHead { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; gap:12px; }
.punchesHead h3 { margin:0; font-size:16px; font-weight:600; }
.punchList { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
.punchList li { display:flex; align-items:center; gap:14px; padding:11px 0; border-bottom:1px solid var(--line); flex-wrap:wrap; }
.punchList li:last-child { border-bottom:none; }
.punchType { font-size:14px; min-width:110px; }
.punchType.in, .punchType.mealEnd, .punchType.restEnd, .punchType.breakEnd { color:var(--live); }
.punchType.out { color:var(--signal); }
.punchType.breakStart, .punchType.mealStart { color:var(--signal); }
.punchType.restStart { color:var(--brk); }
.punchType.breakAttest { color:var(--muted); }
.punchWhen { font-size:15px; }
.editedTag { font-size:12px; color:var(--muted); border:1px solid var(--line); padding:2px 8px; border-radius:999px; }
.editedTag.filled { color:var(--signal); border-color:var(--signal); }
.punchActs { margin-left:auto; display:flex; gap:8px; }
.legalNote { margin-top:22px; color:#5c6774; font-size:13px; line-height:1.6; max-width:78ch; }

.csvBox {
  width:100%; height:260px; margin:12px 0 4px;
  background:var(--asphalt); border:1px solid var(--line); color:var(--ink);
  border-radius:10px; padding:12px; font-size:13px; white-space:pre;
}
.editTitle { margin:0 0 16px; font-size:22px; font-weight:600; }

/* roster */
.rosterHead { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.rosterList { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
.rosterList li {
  display:flex; align-items:center; gap:16px; flex-wrap:wrap;
  background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px 18px;
}
.rosterList li.off { opacity:.45; }
.rosterMain { display:flex; flex-direction:column; gap:2px; min-width:180px; }
.rosterMain strong { font-size:17px; }
.rosterMain span { font-size:14px; color:var(--muted); }
.rosterMeta { display:flex; gap:16px; color:var(--muted); font-size:14px; }
.rosterActs { margin-left:auto; display:flex; gap:8px; }
.pinMask { letter-spacing:.1em; }

.settingsGrid { max-width:520px; }
.cloudTitle { margin-top:36px; }
.cloudBox { display:flex; flex-direction:column; gap:10px; }
.cloudBox p { margin:0; line-height:1.5; }
.setupCloud { margin-top:18px; border-top:1px solid var(--line); padding-top:14px; }

/* boot */
.bootWrap { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; }
.bootPulse { width:36px; height:36px; border-radius:50%; border:2px solid var(--line); border-top-color:var(--signal); animation:spin 1s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.bootTxt { color:var(--muted); }

@media (prefers-reduced-motion: reduce) {
  * { animation:none !important; transition:none !important; }
}
@media (max-width:700px) {
  .bar { flex-direction:column; align-items:flex-start; gap:10px; }
  .barRight { text-align:left; }
  .grid { padding:16px; }
}
`}</style>
  );
}
