import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../../arcade/matrix_of_consciousness_match_3_game.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];

export function createAcademyHarness() {
  const elements = new Map(), timers = new Map(), saves = new Map();
  let timerId = 0;
  function element() {
    return {
      innerHTML: '', innerText: '', dataset: {}, children: [], listeners: new Map(),
      classList: { add() {}, remove() {} },
      parentElement: { clientWidth: 420, clientHeight: 500 },
      getContext: () => null, contains: () => false,
      setAttribute() {}, focus() {},
      addEventListener(name, callback) { this.listeners.set(name, callback); },
      appendChild(child) { this.children.push(child); },
    };
  }
  const context = vm.createContext({
    document: {
      getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
      createElement: element, addEventListener() {}, querySelectorAll: () => [],
    },
    localStorage: { getItem: key => saves.get(key) ?? null, setItem: (key, value) => saves.set(key, value) },
    window: { addEventListener() {} }, requestAnimationFrame() {},
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  });
  vm.runInContext(script, context);
  const run = code => vm.runInContext(code, context);
  return { run, timers, elements, saves, click: id => elements.get(id).listeners.get('click')() };
}
