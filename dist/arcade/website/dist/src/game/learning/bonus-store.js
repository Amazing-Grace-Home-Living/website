const KEY = 'amazing-grace-signal-bonus-v1';
function getStorage(storage) { if (storage !== undefined) return storage; try { return globalThis.localStorage; } catch { return null; } }
function readRaw(storage) {
  storage = getStorage(storage);
  try { const value = JSON.parse(storage?.getItem(KEY) || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; }
}
function writeRaw(value, storage) { try { getStorage(storage)?.setItem(KEY, JSON.stringify(value)); return true; } catch { return false; } }
export function readBonus(storage) { const value = readRaw(storage); return { credits: Number.isSafeInteger(value.credits) && value.credits >= 0 ? value.credits : 0, awards: Array.isArray(value.awards) ? value.awards.filter(id => typeof id === 'string') : [] }; }
export function awardBonus(id, credits, storage) { if (typeof id !== 'string' || !Number.isSafeInteger(credits) || credits < 0) return readBonus(storage); const current = readBonus(storage); if (current.awards.includes(id)) return current; const next = { credits: Math.min(5000, current.credits + credits), awards: [...current.awards, id] }; return writeRaw(next, storage) ? next : current; }
export function claimBonus(storage) { const current = readBonus(storage); if (!current.credits) return 0; return writeRaw({ credits: 0, awards: current.awards }, storage) ? current.credits : 0; }
