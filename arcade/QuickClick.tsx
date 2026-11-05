"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  defaultTargetLifetimeMs,
  nextSpawnDelayMs,
} from "../lib/games/quick-click";
import { useProgress } from "./ProgressProvider";

const DURATION = 20_000;
type Target = { id: number; x: number; y: number; expiresAt: number };
export function QuickClick() {
  const [status, setStatus] = useState<"idle" | "playing" | "ended">("idle");
  const [score, setScore] = useState(0);
  const [remaining, setRemaining] = useState(20);
  const [target, setTarget] = useState<Target | null>(null);
  const run = useRef({
    active: false,
    score: 0,
    end: 0,
    spawnAt: 0,
    attempt: "",
    target: null as Target | null,
    nextId: 0,
  });
  const targetButton = useRef<HTMLButtonElement>(null);
  const result = useRef<HTMLHeadingElement>(null);
  const keyboard = useRef(false);
  const { complete, ready } = useProgress();
  const finish = useCallback(() => {
    if (!run.current.active) return;
    run.current.active = false;
    run.current.target = null;
    setStatus("ended");
    setTarget(null);
    setRemaining(0);
    complete("quick-click", run.current.score, run.current.attempt);
    requestAnimationFrame(() => result.current?.focus());
  }, [complete]);
  useEffect(() => {
    if (status !== "playing") return;
    const tick = () => {
      const now = performance.now();
      const state = run.current;
      if (!state.active) return;
      if (now >= state.end) {
        finish();
        return;
      }
      setRemaining(Math.ceil((state.end - now) / 1000));
      if (state.target && now >= state.target.expiresAt) {
        state.target = null;
        setTarget(null);
      }
      if (!state.target && now >= state.spawnAt) {
        state.target = {
          id: ++state.nextId,
          x: 12 + Math.random() * 76,
          y: 15 + Math.random() * 70,
          expiresAt:
            now + (keyboard.current ? 2000 : defaultTargetLifetimeMs()),
        };
        state.spawnAt = state.target.expiresAt + nextSpawnDelayMs();
        setTarget(state.target);
      }
    };
    tick();
    const interval = window.setInterval(tick, 40);
    const visibility = () => {
      if (document.hidden) finish();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [status, finish]);
  useEffect(() => {
    if (target && keyboard.current) targetButton.current?.focus();
  }, [target]);
  const start = (keyboardMode: boolean) => {
    keyboard.current = keyboardMode;
    run.current = {
      active: true,
      score: 0,
      end: performance.now() + DURATION,
      spawnAt: 0,
      attempt: crypto.randomUUID(),
      target: null,
      nextId: 0,
    };
    setScore(0);
    setRemaining(20);
    setTarget(null);
    setStatus("playing");
  };
  const hit = (id: number) => {
    const state = run.current;
    const now = performance.now();
    if (
      !state.active ||
      state.target?.id !== id ||
      now >= state.target.expiresAt ||
      now >= state.end
    )
      return;
    state.score++;
    state.target = null;
    state.spawnAt = now + nextSpawnDelayMs();
    setScore(state.score);
    setTarget(null);
  };
  return (
    <section className="game-panel">
      {status === "idle" ? (
        <>
          <span className="card-icon gold">✦</span>
          <h2>Find your focus.</h2>
          <p>
            Catch the stars before they fade. Each hit counts once. Twenty hits
            equals 100 practice XP. Switching tabs ends the round.
          </p>
          <p>
            Keyboard mode gives you longer to reach each star. Practice scores
            are personal, so play the way that works for you.
          </p>
          <div className="actions">
            <button
              className="button"
              disabled={!ready}
              onClick={() => start(false)}
            >
              Start 20-second round
            </button>
            <button
              className="button secondary"
              disabled={!ready}
              onClick={() => start(true)}
            >
              Keyboard mode
            </button>
          </div>
        </>
      ) : status === "ended" ? (
        <>
          <p className="eyebrow">ROUND COMPLETE</p>
          <h2 ref={result} tabIndex={-1}>
            A moment of focus, well spent.
          </h2>
          <div className="result-number">
            {score}
            <small> stars caught</small>
          </div>
          <p>
            Your round scored {Math.min(score * 5, 100)}/100. Your best result
            contributes to your practice XP.
          </p>
          <div className="actions">
            <button className="button" onClick={() => start(keyboard.current)}>
              Play again
            </button>
            <Link className="text-link" href="/arcade">
              Back to arcade →
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="game-hud">
            <span>STARS CAUGHT: {score}</span>
            <span role="timer" aria-label="Seconds remaining">
              {remaining}s remaining
            </span>
          </div>
          <div className="star-field" aria-label="Quick Click play area">
            {target && (
              <button
                ref={targetButton}
                className="star-target"
                style={{ left: `${target.x}%`, top: `${target.y}%` }}
                onClick={() => hit(target.id)}
                aria-label="Catch star"
              >
                ✦
              </button>
            )}
          </div>
          <button className="text-button" onClick={finish}>
            Finish round early
          </button>
        </>
      )}
    </section>
  );
}
