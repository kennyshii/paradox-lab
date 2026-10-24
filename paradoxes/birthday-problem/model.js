// Birthday problem maths. Pure functions, no DOM.
import { randInt } from "../../assets/js/lib/random.js";

export const DAYS = 365;

/** Exact probability that at least two of n people share a birthday (365 equally likely days). */
export function pShared(n, days = DAYS) {
  if (n > days) return 1;
  let none = 1;
  for (let k = 0; k < n; k++) none *= (days - k) / days;
  return 1 - none;
}

/** Probability that someone among the other n − 1 people shares *your* birthday. */
export const pSharesMine = (n, days = DAYS) => 1 - ((days - 1) / days) ** Math.max(0, n - 1);

export const pairs = (n) => (n * (n - 1)) / 2;

/** Smallest group size whose probability of a shared birthday reaches p. */
export function groupSizeFor(p, days = DAYS) {
  let n = 1;
  while (pShared(n, days) < p) n++;
  return n;
}

/** Draw one random group. Returns birthdays (day-of-year indexes) and the days that repeat. */
export function sampleGroup(n, rand = Math.random, days = DAYS) {
  const birthdays = Array.from({ length: n }, () => randInt(days, rand));
  const counts = new Map();
  for (const d of birthdays) counts.set(d, (counts.get(d) ?? 0) + 1);
  const shared = [...counts].filter(([, c]) => c > 1).map(([day, count]) => ({ day, count }));
  return { birthdays, counts, shared, hasMatch: shared.length > 0 };
}
