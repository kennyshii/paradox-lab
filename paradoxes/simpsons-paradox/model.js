// Simpson's paradox: real datasets and aggregation helpers. Pure functions, no DOM.

export const DATASETS = {
  kidney: {
    title: "Kidney stone treatments",
    source: "Charig et al., British Medical Journal (1986)",
    a: "Treatment A (open surgery)",
    b: "Treatment B (keyhole surgery)",
    outcome: "success rate",
    groups: [
      { name: "Small stones", a: [81, 87], b: [234, 270] },
      { name: "Large stones", a: [192, 263], b: [55, 80] },
    ],
  },
  berkeley: {
    title: "UC Berkeley graduate admissions, 1973",
    source: "Bickel, Hammel & O’Connell, Science (1975), six largest departments",
    a: "Men",
    b: "Women",
    outcome: "admission rate",
    groups: [
      { name: "Department A", a: [512, 825], b: [89, 108] },
      { name: "Department B", a: [353, 560], b: [17, 25] },
      { name: "Department C", a: [120, 325], b: [202, 593] },
      { name: "Department D", a: [138, 417], b: [131, 375] },
      { name: "Department E", a: [53, 191], b: [94, 393] },
      { name: "Department F", a: [22, 373], b: [24, 341] },
    ],
  },
};

export const rate = ([success, total]) => (total ? success / total : 0);

/** Pool the selected groups for one arm ("a" or "b"). */
export function pooled(groups, arm) {
  const success = groups.reduce((s, g) => s + g[arm][0], 0);
  const total = groups.reduce((s, g) => s + g[arm][1], 0);
  return [success, total];
}

/** Share of an arm's cases that fall in each group (the "mix"). */
export function mix(groups, arm) {
  const total = pooled(groups, arm)[1];
  return groups.map((g) => (total ? g[arm][1] / total : 0));
}

/**
 * Direct standardisation: each arm's rate if both had the same case mix
 * (the combined mix of both arms). This is the fair comparison.
 */
export function standardised(groups, arm) {
  const totals = groups.map((g) => g.a[1] + g.b[1]);
  const all = totals.reduce((s, t) => s + t, 0);
  return groups.reduce((s, g, i) => s + (totals[i] / all) * rate(g[arm]), 0);
}

/** Summary of who wins within groups vs. overall. */
export function summarise(groups) {
  const aWins = groups.filter((g) => rate(g.a) > rate(g.b)).length;
  const overallA = rate(pooled(groups, "a"));
  const overallB = rate(pooled(groups, "b"));
  const majority = aWins * 2 > groups.length ? "a" : aWins * 2 < groups.length ? "b" : null;
  const overall = overallA > overallB ? "a" : overallA < overallB ? "b" : null;
  return { aWins, bWins: groups.length - aWins, overallA, overallB, reversed: majority != null && overall != null && majority !== overall };
}
