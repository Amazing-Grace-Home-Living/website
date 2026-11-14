// Source-owned input: releasing one pointer never releases another source.
export class DefenseInput {
  constructor() { this.activePointers = new Map(); this.keyboard = new Set(); this.sequence = 0; }
  clear() { this.activePointers.clear(); this.keyboard.clear(); this.movementPointerId = null; }
  update(pointerId, x, y, action) {
    const p = this.activePointers.get(pointerId) || { pointerId, action: null };
    const entered = p.action !== action;
    if (entered && (action === 'left' || action === 'right')) p.order = ++this.sequence;
    Object.assign(p, { x, y, action });
    this.activePointers.set(pointerId, p);
    return entered && action === 'drone';
  }
  remove(pointerId) { this.activePointers.delete(pointerId); }
  rebuild() {
    const keys = new Set(this.keyboard);
    let movement = null, mouseFiring = false;
    for (const p of this.activePointers.values()) {
      if (p.action === 'fire') keys.add(' ');
      if (p.action === 'aim') mouseFiring = true;
      if ((p.action === 'left' || p.action === 'right') && (!movement || p.order > movement.order)) movement = p;
    }
    this.movementPointerId = movement?.pointerId ?? null;
    if (movement) {
      for (const key of ['h', 'l', 'ArrowLeft', 'ArrowRight']) keys.delete(key);
      keys.add(movement.action === 'left' ? 'h' : 'l');
    }
    return { keys, mouseFiring };
  }
}
