// Geometry for the rope-around-the-Earth puzzle. Pure functions, no DOM.

/** Mode 1: lengthen the rope by `extra` and lift it evenly. Gap = extra / 2π, independent of R. */
export const uniformGap = (extra) => extra / (2 * Math.PI);

// Series expansions keep precision when θ is tiny (θ ≈ 0.006 rad for the Earth).
const tanMinus = (t) => (t < 1e-2 ? t ** 3 / 3 + (2 * t ** 5) / 15 + (17 * t ** 7) / 315 : Math.tan(t) - t);
const secMinusOne = (t) => (t < 1e-2 ? t ** 2 / 2 + (5 * t ** 4) / 24 + (61 * t ** 6) / 720 : 1 / Math.cos(t) - 1);

/** Extra rope used when the rope is pulled up to a single peak whose tangents touch the sphere at ±θ. */
export const extraForAngle = (R, theta) => 2 * R * tanMinus(theta);

/**
 * Mode 2: pull the lengthened rope up at one point until it is taut.
 * Solves 2R(tan θ − θ) = extra for θ, then height = R(sec θ − 1).
 */
export function peakLift(R, extra) {
  let lo = 0;
  let hi = Math.PI / 2 - 1e-9;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (extraForAngle(R, mid) < extra) lo = mid;
    else hi = mid;
  }
  const theta = (lo + hi) / 2;
  return {
    theta,
    height: R * secMinusOne(theta),
    tangentLength: R * Math.tan(theta),
    groundSpan: R * theta, // arc distance from the peak to where the rope meets the ground
  };
}

/**
 * Profile of the lifted rope as [arcDistance, heightAboveGround] pairs,
 * from −span to +span (in metres). Ground outside ±θ has height 0.
 */
export function liftProfile(R, theta, samples = 120, margin = 1.35) {
  const h = R / Math.cos(theta); // distance of the peak from the centre
  const tx = R * Math.sin(theta);
  const ty = R * Math.cos(theta);
  const half = [];
  for (let i = 0; i <= samples; i++) {
    const s = i / samples;
    const x = s * tx;
    const y = h + s * (ty - h);
    const r = Math.hypot(x, y);
    const phi = Math.atan2(x, y);
    // r − R loses precision for big R; use (r² − R²)/(r + R) instead.
    const height = ((x * x + y * y - R * R) / (r + R));
    half.push([R * phi, Math.max(0, height)]);
  }
  const edge = R * theta * margin;
  const right = [...half, [edge, 0]];
  const left = right.map(([d, v]) => [-d, v]).reverse();
  return [...left, ...right.slice(1)];
}
