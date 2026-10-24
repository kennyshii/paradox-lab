// Zeno's dichotomy as a geometric series. Pure functions, no DOM.

/** Distance covered after k halvings: 1/2 + 1/4 + … + 1/2^k = 1 − 2^−k. */
export const covered = (k) => 1 - 2 ** -k;

/** Distance still to go after k halvings. */
export const remaining = (k) => 2 ** -k;

/** Partial sums of a geometric series with first term a and ratio r. */
export const geometricPartial = (k, a = 0.5, r = 0.5) => (r === 1 ? a * k : (a * (1 - r ** k)) / (1 - r));

/** Partial sums of the harmonic series 1 + 1/2 + … + 1/k, which diverges. */
export function harmonicPartial(k) {
  let s = 0;
  for (let i = 1; i <= k; i++) s += 1 / i;
  return s;
}

/** How many of Zeno's checkpoints (1/2, 3/4, 7/8, …) lie at or before position x in [0, 1). */
export const checkpointsPassed = (x) => (x <= 0 ? 0 : x >= 1 ? Infinity : Math.floor(-Math.log2(1 - x) + 1e-9));

/** At constant speed, time is proportional to distance, so the time steps form the same series. */
export const timeAt = (k, totalSeconds) => totalSeconds * covered(k);
