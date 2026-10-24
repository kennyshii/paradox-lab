// The missing dollar riddle as bookkeeping. Pure functions, no DOM.

/**
 * Three friends pay `paid` for a room that really costs `price`. The refund goes via a
 * bellhop who keeps `kept` and hands the rest back equally.
 */
export function story({ paid = 30, price = 25, kept = 2 } = {}) {
  const refund = paid - price;
  const returned = refund - kept;
  const friendsPaid = paid - returned; // what the friends are out of pocket
  return {
    paid,
    price,
    kept,
    refund,
    returned,
    each: friendsPaid / 3,
    friendsPaid,
    wrongSum: friendsPaid + kept, // the riddle's sum: adds the bellhop's money twice
    rightSum: price + kept, // where the friends' money actually is (= friendsPaid)
  };
}

/**
 * Where each of the 30 one-dollar coins is at each step of the story.
 * Holders: "f0" "f1" "f2" (friends), "desk", "bell". Returns [{ holder, slot }].
 */
export function coinPlaces(step) {
  return Array.from({ length: 30 }, (_, i) => {
    if (step === 0) return { holder: `f${Math.floor(i / 10)}`, slot: i % 10 };
    if (step === 1 || i < 25) return { holder: "desk", slot: i };
    if (step === 2) return { holder: "bell", slot: i - 25 };
    if (i < 28) return { holder: `f${i - 25}`, slot: 0 };
    return { holder: "bell", slot: i - 28 };
  });
}

export const STEPS = [
  "Three friends each put in $10: $30 in total.",
  "They hand all $30 to the hotel desk.",
  "The manager realises the room is only $25, and gives the bellhop $5 to return.",
  "The bellhop keeps $2 and gives each friend $1 back.",
  "Count the coins: the hotel has $25, the bellhop $2, the friends got $3 back. That’s all $30.",
];
