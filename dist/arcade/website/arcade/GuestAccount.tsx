"use client";
import { useProgress } from "./ProgressProvider";
import { PracticeSummary } from "./PracticeSummary";
export function GuestAccount() {
  const { reset, ready } = useProgress();
  return (
    <>
      <PracticeSummary />
      <section className="game-panel">
        <h2>You’re exploring as a guest.</h2>
        <p>
          Practice results stay in this browser. You can play and save notes
          without creating an account.
        </p>
        <p>
          Resetting removes only your game progress. Your workspace notes are
          managed separately.
        </p>
        <button
          className="button secondary"
          disabled={!ready}
          onClick={() => {
            if (confirm("Reset your practice results on this browser?"))
              reset();
          }}
        >
          Reset practice progress
        </button>
      </section>
    </>
  );
}
