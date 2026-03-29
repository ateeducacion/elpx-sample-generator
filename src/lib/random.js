export function hashSeed(seed) {
  const text = String(seed || 'elpx');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandom(seed) {
  return mulberry32(hashSeed(seed));
}

export function intBetween(random, min, max) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.floor(random() * (upper - lower + 1)) + lower;
}

export function pick(random, items) {
  if (!items.length) return undefined;
  return items[intBetween(random, 0, items.length - 1)];
}

export function shuffle(random, items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

