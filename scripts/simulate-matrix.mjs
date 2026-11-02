import { LEVELS } from '../src/game/progress.js';
import {
  applyGravity,
  applyMatches,
  applySwap,
  createPlayableGrid,
  findLegalMoves,
  findMatches,
} from '../src/game/engine/matchmaker.js';

const trials = Number(process.argv[2] || 50);
if (!Number.isInteger(trials) || trials < 1 || trials > 1000) {
  throw Error('Use 1–1000 simulation trials.');
}

let seed = 123456;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

function playLevel(level, strategy) {
  let board = createPlayableGrid(), score = 0, moves = 0;
  // Simulate the whole move budget, then measure whether the target was reached.
  // The live game stops when the target is met; extra simulated moves only expose
  // its eventual score distribution and do not change the win/no-win result.
  while (moves < level.moves) {
    let legal = findLegalMoves(board);
    if (!legal.length) {
      board = createPlayableGrid();
      legal = findLegalMoves(board);
    }
    if (!legal.length) break;

    let choice;
    if (strategy === 'random') {
      choice = legal[Math.floor(random() * legal.length)];
    } else {
      const ranked = legal.map(move => {
        const candidate = applySwap(board, move.from.row, move.from.col, move.to.row, move.to.col);
        const result = findMatches(candidate);
        const matchedCells = result.matches.length;
        return { move, value: matchedCells * 50 + result.specials.length * 25 };
      });
      const bestValue = Math.max(...ranked.map(item => item.value));
      const best = ranked.filter(item => item.value === bestValue);
      choice = best[Math.floor(random() * best.length)].move;
    }

    board = applySwap(board, choice.from.row, choice.from.col, choice.to.row, choice.to.col);
    moves++;
    for (let chain = 1; chain <= 100; chain++) {
      const result = findMatches(board);
      if (!result.matches.length) break;
      const cleared = applyMatches(board, result, chain);
      const count = cleared.flat().filter(cell => cell === null).length;
      score += count * 50 * chain;
      board = applyGravity(cleared);
      if (chain === 100) board = createPlayableGrid();
    }
  }
  return { score, won: score >= level.target, moves };
}

const results = [];
for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex++) {
  const level = LEVELS[levelIndex];
  for (const strategy of ['random', 'greedy']) {
    const outcomes = Array.from({ length: trials }, () => playLevel(level, strategy));
    const scores = outcomes.map(result => result.score).sort((a, b) => a - b);
    const wins = outcomes.filter(result => result.won).length;
    results.push({
      level: levelIndex + 1,
      strategy,
      trials,
      target: level.target,
      moves: level.moves,
      wins,
      winRate: `${Math.round(wins / trials * 100)}%`,
      minimumScore: scores[0],
      lowerQuartile: scores[Math.floor((scores.length - 1) * 0.25)],
      medianScore: scores[Math.floor(scores.length / 2)],
      upperQuartile: scores[Math.floor((scores.length - 1) * 0.75)],
      maximumScore: scores[scores.length - 1],
    });
  }
}

process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
