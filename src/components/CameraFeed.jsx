import { useEffect } from "react";
import { CAM_MSG } from "../hooks/useCamera.js";

export function CameraFeed({ cam, size = "sm" }) {
  const { stream, state, videoRef } = cam;
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const p = videoRef.current.play();
      if (p && p.catch) p.catch(() => {});
    }
  }, [stream, videoRef]);

  return (
    <div className={`cam ${size} ${state}`}>
      <video ref={videoRef} playsInline muted autoPlay className="camVid" />
      {state !== "live" && (
        <div className="camFallback">
          <span className="camIcon">◉</span>
          <span>{CAM_MSG[state] || "Camera off"}</span>
        </div>
      )}
      {state === "live" && <span className="camDot" />}
    </div>
  );
}
