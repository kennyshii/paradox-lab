// The "all horses are the same colour" induction proof, as data. Pure functions, no DOM.

/**
 * Split a herd of m horses (numbered 1..m) the way the proof does.
 * A = everyone except the first, B = everyone except the last.
 */
export function split(m) {
  const all = Array.from({ length: m }, (_, i) => i + 1);
  const A = all.slice(1);
  const B = all.slice(0, -1);
  const overlap = A.filter((x) => B.includes(x));
  return { all, A, B, overlap };
}

/** Does the inductive step P(m − 1) ⇒ P(m) actually go through? Only if A and B overlap. */
export const stepHolds = (m) => m >= 2 && split(m).overlap.length > 0;

/** The proof's steps for a herd of size m (m = n + 1). `ok` is false on the step that breaks. */
export function proofSteps(m) {
  const { overlap } = split(m);
  const n = m - 1;
  return [
    { id: "claim", title: "Claim", text: "In every group of horses, all the horses have the same colour.", ok: true },
    { id: "base", title: "Base case (1 horse)", text: "A group with a single horse is trivially all one colour.", ok: true },
    { id: "hyp", title: `Hypothesis (${n} horse${n === 1 ? "" : "s"})`, text: `Assume every group of ${n} horse${n === 1 ? " is" : "s is"} all one colour.`, ok: true },
    { id: "herd", title: `Take ${m} horses`, text: `Line up any ${m} horses, numbered 1 to ${m}.`, ok: true },
    { id: "A", title: "Remove the first horse", text: `${range(2, m)} form${m === 2 ? "s" : ""} a group of ${n}, so by the hypothesis ${m === 2 ? "it has" : "they share"} one colour: call it α.`, ok: true },
    { id: "B", title: "Remove the last horse", text: `${range(1, m - 1)} also form${m === 2 ? "s" : ""} a group of ${n}, so ${m === 2 ? "it has" : "they share"} one colour: call it β.`, ok: true },
    {
      id: "link",
      title: "Link the two groups",
      text: overlap.length
        ? `Horse${overlap.length > 1 ? "s" : ""} ${listNames(overlap)} ${overlap.length > 1 ? "are" : "is"} in both groups, so α and β are the colour of the same horse: α = β.`
        : `The groups {2} and {1} share no horse at all. Nothing forces α = β. This is where the proof breaks.`,
      ok: overlap.length > 0,
    },
    { id: "done", title: "Conclusion", text: `So all ${m} horses are colour α. By induction, all horses are the same colour.`, ok: overlap.length > 0 },
  ];
}

const range = (a, b) => (a === b ? `Horse ${a} alone` : `Horses ${a}–${b}`);

function listNames(ids) {
  if (ids.length <= 3) return ids.join(", ");
  return `${ids[0]}–${ids.at(-1)}`;
}
