// Shared simulation helpers: run many trials without freezing the page.

/** Counts successes for named outcomes, e.g. new Tally(["stay", "switch"]). */
export class Tally {
  constructor(keys) {
    this.keys = keys;
    this.reset();
  }
  reset() {
    this.trials = 0;
    this.wins = Object.fromEntries(this.keys.map((k) => [k, 0]));
  }
  record(outcome) {
    this.trials++;
    for (const k of this.keys) if (outcome[k]) this.wins[k]++;
  }
  rate(key) {
    return this.trials ? this.wins[key] / this.trials : 0;
  }
}

// requestAnimationFrame stalls in background tabs; fall back to timers there.
const nextFrame = (cb) => (document.hidden ? setTimeout(cb, 16) : requestAnimationFrame(cb));

/**
 * Run `total` calls of `trial()` spread across animation frames.
 * `onProgress(done)` is called after every frame; `onDone(done)` at the end.
 * `frames` is roughly how many frames the run should take (for a visible animation).
 * Returns { cancel }.
 */
export function runTrials({ total, trial, onProgress, onDone, frames = 90 }) {
  const perFrame = Math.max(1, Math.ceil(total / frames));
  let done = 0;
  let cancelled = false;
  const step = () => {
    if (cancelled) return;
    const end = Math.min(total, done + perFrame);
    for (; done < end; done++) trial(done);
    onProgress?.(done);
    if (done < total) nextFrame(step);
    else onDone?.(done);
  };
  nextFrame(step);
  return {
    cancel() {
      cancelled = true;
    },
  };
}

export const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Tween from 0 to 1 over `duration` ms, calling onFrame(t). Resolves when finished.
 * Jumps straight to the end when the user prefers reduced motion.
 */
export function tween(duration, onFrame, easing = easeInOut) {
  return new Promise((resolve) => {
    if (prefersReducedMotion() || duration <= 0) {
      onFrame(1);
      resolve();
      return;
    }
    const start = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      onFrame(easing(t));
      if (t < 1) nextFrame(step);
      else resolve();
    };
    nextFrame(step);
  });
}
