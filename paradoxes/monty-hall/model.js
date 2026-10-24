// Monty Hall with n doors. Pure functions, no DOM.
import { randInt, shuffle } from "../../assets/js/lib/random.js";

/** Set up a round: where the car is. */
export const newRound = (doors, rand = Math.random) => ({ doors, car: randInt(doors, rand) });

/**
 * The host opens every door except the player's pick and one other, never revealing the car.
 * If the player picked the car, the door left closed is chosen at random.
 * Returns the index of the other door left closed.
 */
export function hostLeavesClosed({ doors, car }, pick, rand = Math.random) {
  if (pick !== car) return car;
  const others = [...Array(doors).keys()].filter((d) => d !== pick);
  return others[randInt(others.length, rand)];
}

/** Doors the host opens, in a random order (for animation). */
export function hostOpens(round, pick, keptClosed, rand = Math.random) {
  return shuffle(
    [...Array(round.doors).keys()].filter((d) => d !== pick && d !== keptClosed),
    rand,
  );
}

/** Play one full simulated round with a random first pick. */
export function simulate(doors, rand = Math.random) {
  const round = newRound(doors, rand);
  const pick = randInt(doors, rand);
  const other = hostLeavesClosed(round, pick, rand);
  return { stay: pick === round.car, switch: other === round.car };
}

export const theory = (doors) => ({ stay: 1 / doors, switch: (doors - 1) / doors });
