import { QUIZZES } from './content.js';
const q = (id, prompt, options, answer, explanation, note) => ({ id, prompt, options, answer, explanation, note });
export const TOPICS = ['Navigation', 'Quoting & variables', 'Streams & input', 'Exit status & decisions'];
export const QUESTION_POOLS = [
  [...QUIZZES[0],
    q('parent-path', 'Your working directory is /home/learner/projects. With no symlinks involved, where does cd .. take you?', ['/home/learner', '/home', '/projects'], 0, '.. names the parent of projects, which is /home/learner.', 'Read the path from left to right; one parent step removes the last directory component.'),
    q('current-path', 'What does . mean in a relative path such as ./notes?', ['The parent directory', 'The current directory', 'The home directory of every user'], 1, '. refers to the current directory. ./notes is relative to where you are now.', 'Relative paths are interpreted from the current working directory.'),
    q('absolute-path', 'Which path is absolute on a typical Unix filesystem?', ['notes/today', '../notes', '/home/learner/notes'], 2, 'An absolute path begins with / and starts at the filesystem root.', 'An absolute path and a relative path have different starting points.'),
    q('quoted-directory', 'Assume a directory named project notes exists here. Which command keeps its name as one argument?', ['cd "project notes"', 'cd project notes', 'pwd project notes'], 0, 'The quotes keep the space inside one directory argument. pwd does not change directories.', 'A path containing a space should be passed as one argument.'),
  ],
  [...QUIZZES[1],
    q('literal-variable', "Given name=Ada, what text does printf '%s' '$name' print?", ['Ada', '$name', 'Nothing'], 1, 'Single quotes preserve the literal characters $name instead of expanding the variable.', 'Single quotes and double quotes have different expansion behavior.'),
    q('expanded-variable', 'Given name=Ada, what text does printf \'%s\' "$name" print?', ['$name', 'name', 'Ada'], 2, 'Inside double quotes, $name expands to its value, Ada.', 'Double quotes allow parameter expansion while preserving an argument.'),
    q('spaces-in-value', 'Which assignment stores the entire text blue sky in one variable?', ['label="blue sky"', 'label = "blue sky"', '$label="blue sky"'], 0, 'label="blue sky" uses assignment syntax without spaces around = and quotes the value.', 'The variable name on the left has no $, and there are no spaces around =.'),
    q('empty-value', 'Given an empty variable name, how many arguments does "$name" produce?', ['Zero arguments', 'One empty argument', 'Two arguments'], 1, 'Double quotes preserve one argument even when its expanded value is empty.', 'An empty quoted argument is still an argument.'),
  ],
  [...QUIZZES[2],
    q('pipe-error', 'Does a plain | pipe standard error as well as standard output?', ['Always', 'Only when output is empty', 'No; standard error needs separate redirection'], 2, 'A plain pipe connects standard output. Error output is a separate stream unless explicitly redirected.', 'Standard output and standard error are different streams.'),
    q('read-literal', 'Why use read -r when collecting a line that may contain backslashes?', ['To keep backslashes literal', 'To reverse the line', 'To run the line as a command'], 0, '-r prevents read from interpreting backslashes as escapes. It does not execute the input.', 'Reading data is different from executing a command.'),
    q('printf-data', 'Which command prints the literal word hello?', ["printf '%s\\n' 'hello'", 'cd hello', 'read hello'], 0, 'printf formats and writes output. The %s format prints the provided string.', 'Use an output command when you want to display data.'),
    q('pipe-direction', 'In left | right, which command receives the piped standard input?', ['left', 'right', 'Neither'], 1, 'Data flows from the standard output of left to the standard input of right.', 'Follow the pipeline from left to right.'),
  ],
  [...QUIZZES[3],
    q('or-list', 'When does Bash run second in first || second?', ['Only when first succeeds', 'Always', 'When first exits with a nonzero status'], 2, 'An OR list runs the next command when the previous command does not exit successfully.', '|| can provide a fallback after a command fails.'),
    q('false-and', 'false exits with status 1. Does false && printf \'ready\' run printf?', ['Yes', 'No', 'Only if a file named ready exists'], 1, '&& runs the second command only after a zero exit status. false returns nonzero.', 'Check the exit status before following an && link.'),
    q('true-or', 'true exits with status 0. Does true || printf \'fallback\' run printf?', ['No', 'Yes', 'Only if true prints text'], 0, '|| runs the next command after a nonzero status. true succeeds, so the fallback is skipped.', 'Output text does not decide whether an OR fallback runs.'),
    q('status-variable', 'Which expansion reports the exit status of the most recently executed foreground pipeline?', ['$name', '$?', '$HOME'], 1, '$? expands to the latest foreground pipeline exit status. Another command can replace that status.', 'Capture an exit status before running another command.'),
  ],
];
export const QUESTION_BY_ID = Object.fromEntries(QUESTION_POOLS.flat().map(question => [question.id, question]));
export const legacyQuizPlan = () => QUIZZES.map(pair => pair.map(question => question.id));
export function validateQuizPlan(raw) {
  return Array.isArray(raw) && raw.length === QUESTION_POOLS.length && raw.every((pair, topic) =>
    Array.isArray(pair) && pair.length === 2 && pair[0] !== pair[1] &&
    pair.every(id => typeof id === 'string' && QUESTION_POOLS[topic].some(question => question.id === id)));
}
export function createQuizPlan(random = Math.random, review = {}) {
  return QUESTION_POOLS.map(pool => {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const priority = question => review[question.id]?.lastCorrect === false ? 2 : review[question.id]?.attempts ? 0 : 1;
    return shuffled.sort((a, b) => priority(b) - priority(a)).slice(0, 2).map(question => question.id);
  });
}
export function normalizeReview(raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object') return clean;
  for (const id of Object.keys(QUESTION_BY_ID)) {
    const item = raw[id];
    if (Number.isSafeInteger(item?.attempts) && item.attempts > 0 && item.attempts <= 1e6 &&
        Number.isSafeInteger(item.correct) && item.correct >= 0 && item.correct <= item.attempts && typeof item.lastCorrect === 'boolean' &&
        (item.lastCorrect ? item.correct > 0 : item.correct < item.attempts)) {
      clean[id] = { attempts: item.attempts, correct: item.correct, lastCorrect: item.lastCorrect };
    }
  }
  return clean;
}
export function recordReview(raw, id, correct) {
  const next = normalizeReview(raw);
  if (!Object.hasOwn(QUESTION_BY_ID, id) || typeof correct !== 'boolean') return next;
  const previous = next[id] || { attempts: 0, correct: 0 };
  if (previous.attempts >= 1e6) return next;
  next[id] = { attempts: previous.attempts + 1, correct: previous.correct + Number(correct), lastCorrect: correct };
  return next;
}
