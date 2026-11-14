export const WIDTH = 800;
export const HEIGHT = 480;
export const MOVE_KEYS = { h: [-1, 0], j: [0, 1], k: [0, -1], l: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1], ArrowRight: [1, 0] };
export const WAVES = [
  { name: 'Home Row', count: 8, speed: 26, hp: 24 },
  { name: 'Pathfinder', count: 11, speed: 30, hp: 28 },
  { name: 'Quoted Signals', count: 14, speed: 34, hp: 32 },
  { name: 'Pipeline', count: 16, speed: 36, hp: 36 },
  { name: 'Core Overload', count: 16, speed: 38, hp: 40 },
];
export const QUIZZES = [
  [
    { id: 'pwd', prompt: 'Which Bash builtin prints the current working directory?', options: ['pwd', 'cd', 'read'], answer: 0, explanation: 'pwd prints the current working directory. cd changes the working directory.', note: 'Navigation: distinguish “where am I?” from “move somewhere else.”' },
    { id: 'cd', prompt: 'What does cd .. normally do?', options: ['Lists every file', 'Moves to the parent directory', 'Creates a directory named ..'], answer: 1, explanation: 'cd changes the shell’s working directory. .. refers to the parent directory.', note: 'Paths: . is the current directory, and .. refers to its parent.' },
  ],
  [
    { id: 'quotes', prompt: 'Which form keeps a variable’s expanded value as one argument, even if it contains spaces?', options: ['$name', '"$name"', "'$name'"], answer: 1, explanation: 'Double quotes allow $name to expand while protecting its value from word splitting and pathname expansion. Single quotes preserve the literal text $name.', note: 'Quoting: double quotes preserve an expanded value as one argument.' },
    { id: 'assignment', prompt: 'Which is a Bash variable assignment?', options: ['name = Ada', '$name=Ada', 'name=Ada'], answer: 2, explanation: 'name=Ada assigns the variable. Spaces around = change how the command is parsed.', note: 'Assignments: place no spaces around = in name=value.' },
  ],
  [
    { id: 'pipe', prompt: 'In producer | consumer, what does the pipe connect?', options: ['The first command’s standard output to the second command’s standard input', 'Both commands’ working directories', 'Only their filenames'], answer: 0, explanation: 'A pipe connects standard output from one command to standard input of the next. Standard error is separate unless redirected.', note: 'Pipelines: commands can pass a stream of data to another command.' },
    { id: 'read', prompt: 'Which Bash builtin can read a line from standard input into a variable?', options: ['pwd', 'read', 'cd'], answer: 1, explanation: 'read reads input into shell variables. For a literal line, read -r avoids treating backslashes as escape characters.', note: 'Input: read -r is useful when backslashes should be kept literally.' },
  ],
  [
    { id: 'status', prompt: 'In Bash, an exit status of 0 normally means…', options: ['The command produced no text', 'The shell has no variables', 'The command succeeded'], answer: 2, explanation: 'Zero conventionally indicates success. A nonzero exit status indicates failure or another command-specific condition; it is not a count of output lines.', note: 'Status: success and output are different things.' },
    { id: 'and', prompt: 'When does Bash run the second command in first && second?', options: ['Only if first exits successfully', 'Only if first fails', 'Always, at the same time'], answer: 0, explanation: 'The command after && runs only when the previous command’s exit status is zero.', note: 'Control flow: && lets the next step depend on success.' },
  ],
];
export const BASH_SOURCE = 'https://www.gnu.org/software/bash/manual/bash.html';
