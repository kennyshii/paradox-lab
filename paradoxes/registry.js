// The single list of paradoxes. The home page grid, page headers, badges and
// previous/next links are all generated from this file.
//
// To add a paradox: create /paradoxes/<slug>/ (copy /paradoxes/_template/) and add an entry here.

export const TYPES = {
  veridical: {
    label: "Veridical",
    tagline: "Counterintuitive, but true.",
    description: "The conclusion sounds absurd, yet the argument is sound. Your intuition is what needs fixing.",
  },
  falsidical: {
    label: "Falsidical",
    tagline: "Seems true, but the argument hides a flaw.",
    description: "A convincing-looking argument reaches a false conclusion. The fun is finding the broken step.",
  },
  antinomy: {
    label: "Antinomy",
    tagline: "A genuine contradiction in logic.",
    description: "Accepted rules of reasoning lead to a contradiction. Resolving it means changing the rules.",
  },
};

export const PARADOXES = [
  {
    slug: "rope-around-earth",
    title: "Rope Around the Earth",
    type: "veridical",
    teaser: "Add one metre to a rope hugging the equator. How high does it float? Higher than you think.",
    reason: "The algebra is airtight: the gap is ΔL / 2π no matter how big the sphere is.",
  },
  {
    slug: "monty-hall",
    title: "The Monty Hall Problem",
    type: "veridical",
    teaser: "Three doors, one car. The host opens a goat. Switching wins twice as often, and you can prove it.",
    reason: "Simulation and probability theory agree: switching wins 2/3 of the time.",
  },
  {
    slug: "birthday-problem",
    title: "The Birthday Problem",
    type: "veridical",
    teaser: "Just 23 people give a better-than-even chance that two share a birthday.",
    reason: "It is a correct calculation; intuition counts people when it should count pairs.",
  },
  {
    slug: "simpsons-paradox",
    title: "Simpson’s Paradox",
    type: "veridical",
    teaser: "A treatment can win in every group and still lose overall. Toggle groups and watch the trend flip.",
    reason: "Real datasets show it: aggregation with unequal group sizes really can reverse a trend.",
  },
  {
    slug: "banach-tarski",
    title: "The Banach–Tarski Paradox",
    type: "veridical",
    teaser: "Cut a ball into five pieces, move them rigidly, and get two balls of the same size.",
    reason: "It is a proven theorem of standard set theory (ZFC, with the axiom of choice).",
  },
  {
    slug: "missing-square",
    title: "The Missing Square Puzzle",
    type: "falsidical",
    teaser: "Rearrange four pieces of a triangle and a square vanishes. Where did it go?",
    reason: "The ‘triangle’ is not a triangle: its hypotenuse is slightly bent.",
  },
  {
    slug: "all-horses-same-color",
    title: "All Horses Are the Same Colour",
    type: "falsidical",
    teaser: "A tidy induction proof that every horse shares one colour. Step through it and find the crack.",
    reason: "The proof looks valid, but the inductive step silently fails going from 1 to 2.",
  },
  {
    slug: "zeno-dichotomy",
    title: "Zeno’s Dichotomy",
    type: "falsidical",
    teaser: "To cross a room you must first cross half of it, then half the rest, forever. So how do you ever arrive?",
    reason: "The argument assumes infinitely many steps must take infinite time. Convergent series say otherwise.",
  },
  {
    slug: "liar-paradox",
    title: "The Liar Paradox",
    type: "antinomy",
    teaser: "“This sentence is false.” Build self-referential sentences and see which ones can have a truth value.",
    reason: "Ordinary rules for ‘true’ and ‘false’ give no consistent value at all.",
  },
  {
    slug: "russells-paradox",
    title: "Russell’s Paradox & the Barber",
    type: "antinomy",
    teaser: "The barber shaves everyone who does not shave himself. Who shaves the barber?",
    reason: "Naive set theory proves the set of all non-self-membered sets both is and is not a member of itself.",
  },
];

export const getParadox = (slug) => PARADOXES.find((p) => p.slug === slug);
