"use client";
import { useEffect, useState } from "react";
const KEY = "voj-study-notes-v1";
export function StudyWorkspace() {
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    try {
      setNotes((localStorage.getItem(KEY) ?? "").slice(0, 100_000));
    } catch {
      setSaved(false);
    }
    setLoaded(true);
  }, []);
  const update = (value: string) => {
    setNotes(value);
    try {
      localStorage.setItem(KEY, value);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([notes], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "my-study-notes.txt";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="game-panel">
      <label className="field-label" htmlFor="notes">
        Your reflections & ideas
      </label>
      <textarea
        id="notes"
        rows={14}
        value={notes}
        maxLength={100_000}
        disabled={!loaded}
        onChange={(event) => update(event.target.value)}
        placeholder="A verse to revisit. A question to explore. Something you’re grateful for…"
      />
      <div className="workspace-footer">
        <span role="status">
          {!loaded
            ? "Opening notes…"
            : saved
              ? "Saved on this browser"
              : "Couldn’t save locally. Download a copy before leaving."}
        </span>
        <button className="button" onClick={download} disabled={!notes}>
          Download notes
        </button>
      </div>
      <p className="quiet">
        Notes stay in this browser until you download or clear them. Anyone
        using this browser profile may be able to read them. Avoid passwords,
        API keys, or sensitive information.
      </p>
      <button
        className="text-button"
        disabled={!notes}
        onClick={() => {
          if (
            confirm(
              "Clear these notes from this browser? Download a copy first if you want to keep them.",
            )
          )
            update("");
        }}
      >
        Clear notes
      </button>
    </section>
  );
}
