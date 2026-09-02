import { useEffect, useRef } from "react";

/* ---------- signature ---------- */
export function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const last = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#e9eef4";
  }, []);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const down = (e) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk.current) {
      hasInk.current = true;
      onChange(true);
    }
  };
  const up = () => {
    drawing.current = false;
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    hasInk.current = false;
    onChange(false);
  };

  /* Flatten to a small PNG — line art compresses to a few KB. */
  const exportPng = () => {
    const c = canvasRef.current;
    if (!c || !hasInk.current) return null;
    const out = document.createElement("canvas");
    out.width = 480;
    out.height = Math.round((c.height / c.width) * 480);
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#1a2029";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(c, 0, 0, out.width, out.height);
    return out.toDataURL("image/png");
  };

  useEffect(() => {
    if (canvasRef.current) canvasRef.current.__export = exportPng;
  });

  return (
    <div className="sigWrap">
      <canvas
        ref={canvasRef}
        className="sigPad"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        onTouchStart={down}
        onTouchMove={move}
        onTouchEnd={up}
      />
      <div className="sigBase">
        <span className="sigX">✕ ————————————————</span>
        <button className="btn tiny" onClick={clear}>
          Clear
        </button>
      </div>
      <input type="hidden" ref={(el) => el && (el.__pad = canvasRef.current)} />
    </div>
  );
}
