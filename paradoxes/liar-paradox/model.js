// Self-referential sentences of the form "X is true" / "X is false". Pure functions, no DOM.
//
// A sentence is { target, claim } where target is a sentence index (0, 1, 2) or a fact id,
// and claim is the truth value it asserts about the target.

export const FACTS = {
  snow: { label: "“Snow is white”", value: true },
  pigs: { label: "“Pigs can fly”", value: false },
};

const valueOf = (target, assignment) => (typeof target === "number" ? assignment[target] : FACTS[target].value);

/** What each sentence would have to be, given an assignment of truth values. */
export const claimsUnder = (sentences, assignment) => sentences.map((s) => valueOf(s.target, assignment) === s.claim);

/** Every assignment of T/F to the sentences, with whether it is self-consistent. */
export function truthTable(sentences) {
  const n = sentences.length;
  const rows = [];
  for (let mask = 0; mask < 2 ** n; mask++) {
    // Rows ordered T before F, like a textbook truth table
    const assignment = Array.from({ length: n }, (_, i) => !((mask >> (n - 1 - i)) & 1));
    const claims = claimsUnder(sentences, assignment);
    rows.push({ assignment, claims, consistent: claims.every((c, i) => c === assignment[i]) });
  }
  return rows;
}

/** Classify a set of sentences by how many consistent assignments it has. */
export function verdict(sentences) {
  const count = truthTable(sentences).filter((r) => r.consistent).length;
  if (count === 0) return { kind: "paradox", count };
  if (count === 1) return { kind: "grounded", count };
  return { kind: "underdetermined", count };
}

/**
 * Revision sequence: start from a guess and repeatedly replace each sentence's value
 * with what it claims. Paradoxical sets never settle down.
 */
export function revise(sentences, start, steps = 8) {
  const seq = [start];
  for (let i = 0; i < steps; i++) seq.push(claimsUnder(sentences, seq.at(-1)));
  return seq;
}

export const PRESETS = {
  liar: { label: "The Liar", sentences: [{ target: 0, claim: false }] },
  truthTeller: { label: "The Truth-teller", sentences: [{ target: 0, claim: true }] },
  cycle: {
    label: "Liar cycle",
    sentences: [
      { target: 1, claim: true },
      { target: 0, claim: false },
    ],
  },
  accusers: {
    label: "Mutual accusers",
    sentences: [
      { target: 1, claim: false },
      { target: 0, claim: false },
    ],
  },
  grounded: {
    label: "Grounded chain",
    sentences: [
      { target: 1, claim: true },
      { target: "snow", claim: true },
    ],
  },
  triangle: {
    label: "Three-way loop",
    sentences: [
      { target: 1, claim: true },
      { target: 2, claim: true },
      { target: 0, claim: false },
    ],
  },
};
