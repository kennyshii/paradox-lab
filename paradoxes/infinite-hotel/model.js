// Hilbert's infinite hotel: every way of making room is a rule "the guest in room n
// moves to room f(n)", plus a rule saying where the newcomers go. Pure functions, no DOM.

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];

export const PLANS = {
  one: {
    label: "A new guest arrives",
    rule: "Everyone moves up one room: n → n + 1.",
    move: (n) => n + 1,
    // newcomer number m (from 1) gets this room
    arrive: () => 1,
    arrivals: 1,
    freed: "1 room",
  },
  coach: {
    label: "A coach with 5 guests",
    rule: "Everyone moves up five rooms: n → n + 5.",
    move: (n) => n + 5,
    arrive: (m) => m,
    arrivals: 5,
    freed: "5 rooms",
  },
  bus: {
    label: "An infinite bus",
    rule: "Everyone doubles their room number: n → 2n. The odd rooms are now free.",
    move: (n) => 2 * n,
    arrive: (m) => 2 * m - 1,
    arrivals: Infinity,
    freed: "infinitely many rooms",
  },
  buses: {
    label: "Infinitely many buses",
    rule: "Guests go to powers of 2; bus 1 to powers of 3, bus 2 to powers of 5, and so on.",
    move: (n) => 2 ** n,
    // passenger m of bus b (b ≥ 1) goes to the m-th power of the (b+1)-th prime
    arrive: (m, b = 1) => PRIMES[b] ** m,
    arrivals: Infinity,
    freed: "infinitely many rooms (with lots left empty)",
  },
};

/** True if no two of the first `count` inputs land in the same room. */
export function isOneToOne(f, count = 1000) {
  const seen = new Set();
  for (let n = 1; n <= count; n++) {
    const r = f(n);
    if (seen.has(r)) return false;
    seen.add(r);
  }
  return true;
}

/**
 * Apply a plan to the occupancy of rooms 1..size (index 0 = room 1). Rooms beyond `size`
 * are assumed full of guests, which is exactly the infinite hotel seen through a window.
 * Returns the new occupancy plus a list of moves for animation.
 */
export function applyPlan(rooms, plan, makeGuest) {
  const size = rooms.length;
  const next = Array(size).fill(null);
  const moves = [];
  rooms.forEach((guest, i) => {
    if (!guest) return;
    const to = plan.move(i + 1);
    if (to <= size) next[to - 1] = guest;
    moves.push({ guest, from: i + 1, to });
  });
  const arrivals = [];
  const buses = plan === PLANS.buses ? 3 : 1;
  for (let b = 1; b <= buses; b++) {
    for (let m = 1; m <= Math.min(plan.arrivals, size); m++) {
      const to = plan.arrive(m, b);
      if (to > size) break;
      const guest = makeGuest(b, m);
      next[to - 1] = guest;
      arrivals.push({ guest, to, bus: b, m });
    }
  }
  return { rooms: next, moves, arrivals };
}

export const freeRooms = (rooms) => rooms.reduce((s, g, i) => (g ? s : [...s, i + 1]), []);
