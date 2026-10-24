// Number formatting helpers.

const nf = (digits) => new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const fmt = (value, digits = 0) => nf(digits).format(value);

export const pct = (value, digits = 1) =>
  `${new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value * 100)}%`;

/** Format a length in metres with a sensible unit. */
export function length(meters, digits = 1) {
  const abs = Math.abs(meters);
  if (abs >= 1e9) return `${fmt(meters / 1e9, digits)} million km`;
  if (abs >= 1e6) return `${fmt(meters / 1e3, 0)} km`;
  if (abs >= 1e3) return `${fmt(meters / 1e3, digits)} km`;
  if (abs >= 1) return `${fmt(meters, digits)} m`;
  if (abs >= 0.01) return `${fmt(meters * 100, digits)} cm`;
  return `${fmt(meters * 1000, digits)} mm`;
}

/** Turn a fraction like 0.6667 into "2/3" when it is close to a simple fraction. */
export function fraction(value, maxDen = 12) {
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(value * d);
    if (Math.abs(n / d - value) < 1e-9) return d === 1 ? String(n) : `${n}/${d}`;
  }
  return fmt(value, 3);
}
