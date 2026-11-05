"use client";
import { useProgress } from "./ProgressProvider";
import { totalXp } from "../lib/progress";

export function PracticeSummary() {
  const { progress, ready, persistent } = useProgress();
  return (
    <section className="progress-strip" aria-label="Practice progress">
      <div>
        <span className="eyebrow">YOUR JOURNEY</span>
        <strong>
          {ready ? totalXp(progress) : "—"}
          <small> / 200 practice XP</small>
        </strong>
      </div>
      <div>
        <span>Bible Quiz best</span>
        <strong>
          {ready ? progress.best["bible-quiz"] : "—"}
          <small> / 100</small>
        </strong>
      </div>
      <div>
        <span>Quick Click best</span>
        <strong>
          {ready ? progress.best["quick-click"] : "—"}
          <small> / 100</small>
        </strong>
      </div>
      <p>
        {persistent
          ? "Saved on this browser. No account needed."
          : "Storage is unavailable. Progress lasts for this session."}{" "}
        Practice XP has no cash value.
      </p>
    </section>
  );
}
