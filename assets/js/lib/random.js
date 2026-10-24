// Random number helpers. Pass a seeded generator for reproducible tests.

/** Mulberry32: tiny, fast, seedable PRNG returning floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [0, n). */
export const randInt = (n, rand = Math.random) => Math.floor(rand() * n);

export const pick = (arr, rand = Math.random) => arr[randInt(arr.length, rand)];

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle(arr, rand = Math.random) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1, rand);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
