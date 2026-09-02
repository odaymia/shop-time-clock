import { useState, useEffect, useRef, useCallback } from "react";

/* ---------- camera ---------- */
export const CAM_MSG = {
  idle: "",
  starting: "Camera starting…",
  live: "Camera on — a photo is saved with your punch",
  denied: "Camera blocked. Allow camera access in Safari settings.",
  unsupported: "No camera available on this device.",
};

export function useCamera(enabled) {
  const [stream, setStream] = useState(null);
  const [state, setState] = useState("idle");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const start = useCallback(async () => {
    if (!enabled) return;
    if (streamRef.current) {
      setState("live");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState("unsupported");
      return;
    }
    setState("starting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = s;
      setStream(s);
      setState("live");
    } catch (err) {
      setState(err && err.name === "NotAllowedError" ? "denied" : "unsupported");
    }
  }, [enabled]);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
    }
    setState("idle");
  }, []);

  /* Downscale hard: a 320px JPEG is plenty to recognise a face
     and keeps a year of punches inside the storage budget. */
  const capture = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    try {
      const w = 320;
      const h = Math.round((v.videoHeight / v.videoWidth) * w);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.translate(w, 0);
      ctx.scale(-1, 1); // un-mirror so the saved photo reads naturally
      ctx.drawImage(v, 0, 0, w, h);
      return c.toDataURL("image/jpeg", 0.55);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { stream, state, start, stop, capture, videoRef };
}
