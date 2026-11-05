"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  emptyProgress,
  parseProgress,
  PROGRESS_KEY,
  recordAttempt,
  type GameId,
  type Progress,
} from "../lib/progress";

type ProgressContextValue = {
  progress: Progress;
  ready: boolean;
  persistent: boolean;
  complete: (game: GameId, score: number, attemptId: string) => void;
  reset: () => void;
};
const Context = createContext<ProgressContextValue | null>(null);
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState(emptyProgress);
  const current = useRef(progress);
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);
  useEffect(() => {
    try {
      current.current = parseProgress(localStorage.getItem(PROGRESS_KEY));
      setProgress(current.current);
    } catch {
      setPersistent(false);
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === PROGRESS_KEY || event.key === null) {
        current.current = parseProgress(event.newValue);
        setProgress(current.current);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const complete = useCallback(
    (game: GameId, score: number, attemptId: string) => {
      let latest = current.current;
      try {
        const stored = localStorage.getItem(PROGRESS_KEY);
        if (stored !== null) latest = parseProgress(stored);
      } catch {
        /* Session-only mode. */
      }
      const next = recordAttempt(latest, game, score, attemptId);
      current.current = next;
      setProgress(next);
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      } catch {
        setPersistent(false);
      }
    },
    [],
  );
  const reset = useCallback(() => {
    current.current = emptyProgress();
    setProgress(current.current);
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      setPersistent(false);
    }
  }, []);
  return (
    <Context.Provider value={{ progress, ready, persistent, complete, reset }}>
      {children}
    </Context.Provider>
  );
}
export function useProgress() {
  const context = useContext(Context);
  if (!context) throw new Error("ProgressProvider is required");
  return context;
}
