// Scenes for the Simpson's paradox explainer video.
import { C, seg, ease, easeOut, text, rrect, circle, title, tag } from "../../assets/js/lib/explainer.js";

const A = C.blue;
const B = "#ff8a4c";
// kidney stone data: [successes, patients]
const DATA = { small: { a: [81, 87], b: [234, 270] }, large: { a: [192, 263], b: [55, 80] } };
const rate = ([s, n]) => s / n;
const pct = (v) => `${Math.round(v * 100)}%`;

function bars(ctx, u, x, label, ra, rb, { alpha = 1, grow = 1, winner = null } = {}) {
  const base = 38 * u;
  const H = 28 * u;
  for (const [k, r, col] of [
    [0, ra, A],
    [1, rb, B],
  ]) {
    const bx = (x - 5 + k * 6) * u;
    const hh = H * r * grow;
    rrect(ctx, bx, base - hh, 5 * u, hh, [u, u, 0, 0], { fill: col, alpha });
    text(ctx, pct(r), bx + 2.5 * u, base - hh - 2 * u, { size: 2.2 * u, weight: 800, color: col, alpha: alpha * grow });
  }
  text(ctx, label, x * u, base + 3 * u, { size: 2.2 * u, color: C.dim, alpha });
  if (winner) tag(ctx, `${winner} wins`, x * u, 5 * u, u, { color: winner === "A" ? A : B, size: 2.2, alpha });
}

function crowd(ctx, u, x, y, n, col, alpha = 1) {
  // one dot per 10 patients
  for (let i = 0; i < Math.round(n / 10); i++) circle(ctx, (x + (i % 6) * 1.6) * u, (y - Math.floor(i / 6) * 1.6) * u, 0.6 * u, { fill: col, alpha });
}

export const scenes = [
  {
    caption: "Doctors compared two treatments for kidney stones. Call them A and B.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      tag(ctx, "Treatment A", 34 * u, 22 * u, u, { color: A, size: 4, alpha: easeOut(seg(p, 0, 0.3)) });
      tag(ctx, "Treatment B", 66 * u, 22 * u, u, { color: B, size: 4, alpha: easeOut(seg(p, 0.2, 0.5)) });
    },
  },
  {
    caption: "For patients with small stones, A worked better.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      bars(ctx, u, 28, "Small stones", rate(DATA.small.a), rate(DATA.small.b), { grow: ease(seg(p, 0.1, 0.6)), winner: p > 0.6 ? "A" : null });
    },
  },
  {
    caption: "For patients with large stones, A worked better too.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      bars(ctx, u, 28, "Small stones", rate(DATA.small.a), rate(DATA.small.b), { winner: "A" });
      bars(ctx, u, 50, "Large stones", rate(DATA.large.a), rate(DATA.large.b), { grow: ease(seg(p, 0.1, 0.6)), winner: p > 0.6 ? "A" : null });
    },
  },
  {
    caption: "So A is better overall… right? Add everyone up, and B comes out ahead: 83% against 78%!",
    duration: 6,
    draw(ctx, w, h, { p, t, u }) {
      bars(ctx, u, 28, "Small stones", rate(DATA.small.a), rate(DATA.small.b), { winner: "A" });
      bars(ctx, u, 50, "Large stones", rate(DATA.large.a), rate(DATA.large.b), { winner: "A" });
      const all = (arm) => [DATA.small[arm][0] + DATA.large[arm][0], DATA.small[arm][1] + DATA.large[arm][1]];
      bars(ctx, u, 76, "Everyone", rate(all("a")), rate(all("b")), { grow: ease(seg(p, 0.3, 0.7)), winner: p > 0.7 ? "B" : null });
    },
  },
  {
    caption: "The catch: most of A’s patients had large stones, the hard cases, where every treatment does worse.",
    duration: 6.5,
    draw(ctx, w, h, { p, u }) {
      title(ctx, w, u, "Who got which patients?", { size: 3.6, y: 6, alpha: seg(p, 0, 0.2) });
      text(ctx, "Small stones (easy)", 30 * u, 40 * u, { size: 2.4 * u, color: C.green });
      text(ctx, "Large stones (hard)", 70 * u, 40 * u, { size: 2.4 * u, color: C.red });
      const a = seg(p, 0.1, 0.4);
      const b = seg(p, 0.45, 0.75);
      for (const [x, n, col, al, lbl] of [
        [18, DATA.small.a[1], A, a, "A"],
        [32, DATA.small.b[1], B, b, "B"],
        [58, DATA.large.a[1], A, a, "A"],
        [72, DATA.large.b[1], B, b, "B"],
      ]) {
        crowd(ctx, u, x, 34, n, col, al);
        text(ctx, `${lbl}: ${n}`, (x + 4) * u, 36.5 * u, { size: 1.9 * u, weight: 700, color: col, alpha: al });
      }
    },
  },
  {
    caption: "B mostly treated easy cases, so its total looks better. The totals compare two very different mixes of patients.",
    duration: 6.5,
    draw(ctx, w, h, { p, u }) {
      const q = ease(seg(p, 0.1, 0.6));
      rrect(ctx, 14 * u, 10 * u, 34 * u, 24 * u, 2 * u, { fill: "rgba(50,213,131,0.10)", stroke: C.green, alpha: q });
      rrect(ctx, 52 * u, 10 * u, 34 * u, 24 * u, 2 * u, { fill: "rgba(255,90,100,0.10)", stroke: C.red, alpha: q });
      text(ctx, "mostly easy cases", 31 * u, 14 * u, { size: 2.2 * u, color: C.green, alpha: q });
      text(ctx, "mostly hard cases", 69 * u, 14 * u, { size: 2.2 * u, color: C.red, alpha: q });
      tag(ctx, "B: 83%", 31 * u, 24 * u, u, { color: B, size: 4, alpha: q });
      tag(ctx, "A: 78%", 69 * u, 24 * u, u, { color: A, size: 4, alpha: q });
    },
  },
  {
    caption: "The lesson: before trusting a total, check whether the groups being compared were mixed the same way.",
    duration: 5.5,
    draw(ctx, w, h, { p, u }) {
      title(ctx, w, u, "Check the mix", { y: 20, size: 8, alpha: easeOut(seg(p, 0, 0.4)) });
      text(ctx, "Same patients for both → A wins, every time", w / 2, 32 * u, { size: 3 * u, color: C.dim, alpha: seg(p, 0.3, 0.6) });
    },
  },
];
