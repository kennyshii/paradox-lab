// The free group F₂ on generators a, b, used in the Banach–Tarski proof. Pure functions, no DOM.
// Letters: "a", "A" (= a⁻¹), "b", "B" (= b⁻¹).

export const INVERSE = { a: "A", A: "a", b: "B", B: "b" };
export const PRETTY = { a: "a", A: "a⁻¹", b: "b", B: "b⁻¹" };

/** All reduced words up to `depth` letters (no letter next to its inverse). */
export function reducedWords(depth) {
  const words = [""];
  let frontier = [""];
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (const w of frontier) {
      for (const l of "aAbB") if (w.at(-1) !== INVERSE[l]) next.push(w + l);
    }
    words.push(...next);
    frontier = next;
  }
  return words;
}

/** Which of the four pieces W(a), W(a⁻¹), W(b), W(b⁻¹) a word belongs to ("" for the identity). */
export const pieceOf = (word) => word[0] ?? "";

/** Left-multiply a reduced word by a letter, reducing the result. */
export const leftMultiply = (letter, word) => (word[0] === INVERSE[letter] ? word.slice(1) : letter + word);

/**
 * The key identity: a⁻¹·W(a) is every word that does NOT start with a⁻¹.
 * So F₂ = a⁻¹·W(a) ∪ W(a⁻¹): two pieces rebuild the whole group.
 */
export const inShiftedPiece = (letter, word) => word[0] !== INVERSE[letter];
