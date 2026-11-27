// Deterministic seeded PRNG (mulberry32) and helpers so runs and screenshot scenes are repeatable.

/** Create a deterministic random generator returning numbers in [0, 1). */
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Return a random float in [min, max). */
export function randomRange(rng, min, max) {
  return min + rng() * (max - min);
}

/** Return a random integer in [min, max] inclusive. */
export function randomInt(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}

/** Pick one element from a non-empty array. */
export function randomPick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
