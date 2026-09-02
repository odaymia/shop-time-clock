import { useState, useRef } from "react";

export function CsvModal({ csv, onClose }) {
  const taRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
    } catch {
      if (taRef.current) {
        taRef.current.select();
        try {
          document.execCommand("copy");
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }
    }
  };
  return (
    <div className="overlay">
      <div className="csvCard">
        <button className="closeX" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="editTitle">Payroll export</h2>
        <p className="muted">
          Copy this and paste it into a spreadsheet. Columns are ready for hours, OT, and double
          time.
        </p>
        <textarea ref={taRef} className="csvBox" readOnly value={csv} />
        <button className="btn primary lg full" onClick={copy}>
          {copied ? "Copied" : "Copy to clipboard"}
        </button>
      </div>
    </div>
  );
}
