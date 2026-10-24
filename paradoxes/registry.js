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
    slug: "infinite-hotel",
    title: "Hilbert’s Infinite Hotel",
    type: "veridical",
    teaser: "Every room is full. A guest arrives, then a bus with infinitely many more. Watch the hotel fit them all.",
    reason: "Nothing is wrong with the argument: infinity really does behave this way, and mathematicians rely on it.",
  },
  {
    slug: "rope-around-earth",
    title: "Rope Around the Earth",
    type: "veridical",
    teaser: "Add one metre to a rope hugging the equator. How high does it float? Higher than you think.",
    reason: "It checks out: the gap depends only on the extra rope, never on the size of the planet.",
  },
  {
    slug: "monty-hall",
    title: "The Monty Hall Problem",
    type: "veridical",
    teaser: "Three doors, one car. The host opens a goat. Switching wins twice as often, and you can prove it.",
    reason: "It’s genuinely true: play it a few thousand times and switching wins two games out of three.",
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
    reason: "It happens in real data: lumping uneven groups together really can flip the result.",
  },
  {
    slug: "banach-tarski",
    title: "The Banach–Tarski Paradox",
    type: "veridical",
    teaser: "Cut a ball into five pieces, move them rigidly, and get two balls of the same size.",
    reason: "It’s a proven theorem. The pieces are just too strange to have a size.",
  },
  {
    slug: "missing-square",
    title: "The Missing Square Puzzle",
    type: "falsidical",
    teaser: "Rearrange four pieces of a triangle and a square vanishes. Where did it go?",
    reason: "The ‘triangle’ is not a triangle: its hypotenuse is slightly bent.",
  },
  {
    slug: "missing-dollar",
    title: "The Missing Dollar Riddle",
    type: "falsidical",
    teaser: "Three friends, a $30 room and a sneaky bellhop. $27 + $2 = $29… so where did the last dollar go?",
    reason: "Every coin is accounted for. The riddle just adds two numbers that don’t belong together.",
  },
  {
    slug: "zeno-dichotomy",
    title: "Zeno’s Dichotomy",
    type: "falsidical",
    teaser: "To cross a room you must first cross half of it, then half the rest, forever. So how do you ever arrive?",
    reason: "The argument assumes infinitely many steps must take forever. Shrinking steps can add up to a normal walk.",
  },
  {
    slug: "liar-paradox",
    title: "The Liar Paradox",
    type: "antinomy",
    teaser: "“This sentence is false.” Build self-referential sentences and see which ones can have a truth value.",
    reason: "No matter which answer you pick, the sentence flips it. Ordinary true and false simply break.",
  },
  {
    slug: "russells-paradox",
    title: "Russell’s Paradox & the Barber",
    type: "antinomy",
    teaser: "The barber shaves everyone who does not shave himself. Who shaves the barber?",
    reason: "The rule contradicts itself whichever way you answer, so the barber (and Russell’s collection) can’t exist.",
  },
];

export const getParadox = (slug) => PARADOXES.find((p) => p.slug === slug);
