import { createAcademyHarness } from '../tests/helpers/academy.mjs';
const { run } = createAcademyHarness();
const trials = Number(process.argv[2] || 50);
if (!Number.isInteger(trials) || trials < 1 || trials > 1000) throw Error('Use 1–1000 simulation trials.');
run(`let simulationSeed = 123456; Math.random = () => ((simulationSeed = (Math.imul(simulationSeed, 1664525) + 1013904223) >>> 0) / 4294967296);`);
const results = run(`CAMPAIGN.map(level => {
  const outcomes = [];
  for (let attempt = 0; attempt < ${trials}; attempt++) {
    let board = createPlayableGrid(), points = 0, stars = 0, matches = 0, combo = 0;
    for (let move = 0; move < level.moves; move++) {
      if (!hasLegalMove(board)) board = createPlayableGrid();
      const edges = [];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) if (r+dr < 7 && c+dc < 7) edges.push([r,c,r+dr,c+dc]);
      for (let i = edges.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i+1)); [edges[i], edges[j]] = [edges[j], edges[i]]; }
      for (const edge of edges) {
        const candidate = applySwap(board, ...edge);
        if (findMatches(candidate).length) { board = candidate; break; }
      }
      matches++;
      for (let chain = 1; chain <= 100; chain++) {
        const groups = findMatches(board); if (!groups.length) break;
        const cells = [...new Map(groups.flat().map(cell => [cell.r+','+cell.c, cell])).values()];
        points += cells.length * 10 * chain; stars += cells.filter(cell => gemKind(board[cell.r][cell.c]) === 'star').length;
        combo = Math.max(combo, chain); board = applyGravity(clearMatches(board, cells));
        if (chain === 100) board = createPlayableGrid();
      }
      if (points >= level.targetScore && matches >= (level.targetMatches||0) && stars >= (level.targetStars||0) && combo >= (level.targetCombo||0)) break;
    }
    outcomes.push({ points, won: points >= level.targetScore && matches >= (level.targetMatches||0) && stars >= (level.targetStars||0) && combo >= (level.targetCombo||0) });
  }
  return { mission: level.id, trials: ${trials}, target: level.targetScore, moves: level.moves, wins: outcomes.filter(o=>o.won).length,
    medianScore: outcomes.map(o=>o.points).sort((a,b)=>a-b)[Math.floor(outcomes.length/2)] };
})`);
console.table(results);
