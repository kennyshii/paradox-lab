// Barber paradox and Russell's paradox as small finite models. Pure functions, no DOM.

/** The barber's rule: he shaves exactly those villagers who do not shave themselves. */
export const barberShaves = (shavesSelf) => !shavesSelf;

/**
 * Test a supposition about the barber. `barberShavesSelf` is the assumption;
 * the rule then says what must happen. Consistent only if they agree (they never do).
 */
export function testBarber(barberShavesSelf) {
  const ruleSays = barberShaves(barberShavesSelf);
  return { assumed: barberShavesSelf, ruleSays, consistent: ruleSays === barberShavesSelf };
}

/**
 * Russell's set over a finite universe. `contains[i][j]` is true when set j is a member of set i.
 * R = { x : x ∉ x } contains set j exactly when set j does not contain itself.
 */
export const russellRow = (contains) => contains.map((row, j) => !contains[j][j]);

/** R disagrees with every set S_i at column i (the diagonal), whatever the table holds. */
export const differsOnDiagonal = (contains) => {
  const r = russellRow(contains);
  return contains.every((row, i) => row[i] !== r[i]);
};

/** Adding R to its own universe: does R ∈ R? Both answers contradict the definition. */
export function testRussell(rInR) {
  const definitionSays = !rInR; // R contains x iff x ∉ x; apply to x = R
  return { assumed: rInR, definitionSays, consistent: definitionSays === rInR };
}
