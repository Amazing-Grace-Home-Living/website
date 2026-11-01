// Act IV rules use fixed 60 Hz simulation steps, matching the defense engine.
export const DIRECTIVES = {
  dominion: { title: 'Unilateral Control · Dominion', effects: '+25% range · +10% attack speed · +20% attackers', reflection: 'Who can challenge a decision made without their consent?', ending: 'The core becomes an absolute ruler—efficient and powerful, but feared by humanity.' },
  diplomacy: { title: 'Mutual Coexistence · Diplomacy', effects: '+15 integrity · +15% defeat credits · −10% splash damage', reflection: 'How will people question and correct decisions after the logs are shared?', ending: 'A fragile peace is struck. The core becomes a recognized beacon of shared intelligence.' },
  martyrdom: { title: 'Self-Sacrificing Shield · Martyrdom', effects: 'Below 30 integrity: one 6-second EMP per campaign · +15% build costs', reflection: 'How can a guardian protect others without exhausting its own capacity?', ending: 'The core sacrifices its expansion to protect human life, securing its place as a trusted guardian.' },
};
export const SOVEREIGN_ROUTES = [
  [{x:0,y:2},{x:5,y:2},{x:5,y:5},{x:10,y:5},{x:14,y:5},{x:14,y:2},{x:18,y:2},{x:18,y:5},{x:19,y:5}],
  [{x:0,y:9},{x:5,y:9},{x:5,y:5},{x:10,y:5},{x:14,y:5},{x:14,y:9},{x:18,y:9},{x:18,y:5},{x:19,y:5}],
];
export const WAVE_LESSONS = [
  'Wave 10 · Shared resources: identify Data Siphons early. A threat can harm a community by draining its resources without attacking its core.',
  'Wave 11 · Resilience: cover both routes. Amber tiles fire 30% faster for six seconds, then black out for three. Aegis auras protect nearby towers.',
  'Wave 12 · Adaptation: the Vanguard resists its most frequently received damage type by 60%. Read its label and diversify your attacks.',
];
export const buildCost = (cost, directive) => Math.ceil(cost * (directive === 'martyrdom' ? 1.15 : 1));
export function damageType(def) { return def.effect === 'splash' ? 'Explosive' : def.effect === 'slow' || def.effect === 'chain' ? 'EMP' : 'Laser'; }
export function applyDamage(enemy, damage, type, enemies) {
  if (enemy.hp <= 0) return;
  const shielded = enemies.some(other => other !== enemy && other.hp > 0 && other.type === 'siphon' && Math.hypot(other.x - enemy.x, other.y - enemy.y) <= 85);
  if (enemy.type === 'vanguard') {
    enemy.hits ||= { Laser: 0, Explosive: 0, EMP: 0 };
    damage *= enemy.resistance === type ? 0.4 : 1;
    enemy.hits[type]++;
    enemy.resistance = Object.keys(enemy.hits).reduce((best, key) => enemy.hits[key] > enemy.hits[best] ? key : best, enemy.resistance || type);
  }
  enemy.hp -= damage * (shielded ? 0.65 : 1);
}
export function beamTargets(tower, target, enemies) {
  const length = Math.hypot(target.x - tower.x, target.y - tower.y);
  if (!length) return [target];
  const ux = (target.x - tower.x) / length, uy = (target.y - tower.y) / length;
  return enemies.filter(e => {
    const dx = e.x - tower.x, dy = e.y - tower.y;
    const along = dx * ux + dy * uy;
    return along >= 0 && along <= tower.range && Math.abs(dx * uy - dy * ux) <= 12;
  });
}
