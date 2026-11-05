"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { questions, type Question } from "../lib/games/questions";
import { useProgress } from "./ProgressProvider";

export function BibleQuiz() {
  const [round, setRound] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const lock = useRef(false);
  const attemptId = useRef("");
  const heading = useRef<HTMLHeadingElement>(null);
  const { complete, ready } = useProgress();
  const start = () => {
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    attemptId.current = crypto.randomUUID();
    lock.current = false;
    setIndex(0);
    setCorrect(0);
    setAnswer(null);
    setDone(false);
    setRound(shuffled);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const choose = (choice: number) => {
    if (lock.current || answer !== null || done) return;
    lock.current = true;
    setAnswer(choice);
    if (choice === round[index].answerIndex) setCorrect((n) => n + 1);
  };
  const next = () => {
    if (answer === null) return;
    if (index === round.length - 1) {
      complete("bible-quiz", correct, attemptId.current);
      setDone(true);
    } else {
      setIndex((n) => n + 1);
      setAnswer(null);
      lock.current = false;
    }
    requestAnimationFrame(() => heading.current?.focus());
  };
  const question = round[index];
  return (
    <section className="game-panel">
      {!question ? (
        <>
          <span className="card-icon">Aa</span>
          <h2>Bible Study Quiz</h2>
          <p>
            Ten questions. No timer. After each answer, explore the Scripture
            reference and a short explanation.
          </p>
          <button className="button" onClick={start} disabled={!ready}>
            Begin quiz
          </button>
        </>
      ) : done ? (
        <>
          <p className="eyebrow">ROUND COMPLETE</p>
          <h2 ref={heading} tabIndex={-1}>
            Room to learn. Reasons to celebrate.
          </h2>
          <div className="result-number">
            {correct}
            <small> / {round.length} correct</small>
          </div>
          <p>
            You scored {correct * 10}/100. Your best quiz result contributes to
            your practice XP.
          </p>
          <div className="actions">
            <button className="button" onClick={start}>
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
            <span>
              QUESTION {index + 1} OF {round.length}
            </span>
            <span>{correct} correct</span>
          </div>
          <progress
            aria-label="Quiz progress"
            value={index + (answer !== null ? 1 : 0)}
            max={round.length}
          />
          <h2 ref={heading} tabIndex={-1}>
            {question.text}
          </h2>
          <div className="choices">
            {question.choices.map((choice, i) => (
              <button
                key={choice}
                disabled={answer !== null}
                onClick={() => choose(i)}
                className={`choice ${answer !== null && i === question.answerIndex ? "correct" : answer === i ? "incorrect" : ""}`}
              >
                <span>{String.fromCharCode(65 + i)}</span>
                {choice}
                {answer !== null && i === question.answerIndex && (
                  <strong className="answer-label">Correct</strong>
                )}
              </button>
            ))}
          </div>
          {answer !== null && (
            <div className="feedback" role="status">
              <strong>
                {answer === question.answerIndex
                  ? "That’s right."
                  : `The answer is ${question.choices[question.answerIndex]}.`}
              </strong>
              <p>{question.explanation}</p>
              <span>{question.reference}</span>
            </div>
          )}
          {answer !== null && (
            <button className="button" onClick={next}>
              {index === round.length - 1 ? "See results" : "Next question"} →
            </button>
          )}
        </>
      )}
    </section>
  );
}
