// Scenes for the Banach–Tarski explainer video.
import { C, seg, ease, easeOut, text, title, tag, person } from "../../assets/js/lib/explainer.js";

const N = 900;
const COLORS = ["#2997ff", "#32d583", "#ff8a4c", "#bf5af2", "#ff4fa3"];
const fib = (n) =>
  Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    return [Math.cos(i * 2.399963) * r, y, Math.sin(i * 2.399963) * r];
  });
const BASE = fib(N);
const hash = (i) => {
  const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
};
const PIECE = BASE.map((_, i) => Math.floor(hash(i) * 5));
const counts = [0, 0];
const SLOT = PIECE.map((k) => counts[k < 2 ? 0 : 1]++);
const BALL = [fib(counts[0]), fib(counts[1])];

/**
 * Draw the points. `layout(i)` returns [cx, cy, r, vec] for point i, in pixels.
 */
function dots(ctx, t, layout, { colored = true } = {}) {
  const spin = t * 0.4;
  const cs = Math.cos(spin);
  const sn = Math.sin(spin);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < N; i++) {
    const [cx, cy, r, v] = layout(i);
    const z = -v[0] * sn + v[2] * cs;
    ctx.globalAlpha = 0.35 + 0.65 * ((z + 1) / 2);
    ctx.fillStyle = colored ? COLORS[PIECE[i]] : "#cfe3ff";
    const s = 1.3 + ((z + 1) / 2) * 1.8;
    ctx.fillRect(cx + (v[0] * cs + v[2] * sn) * r - s / 2, cy + v[1] * r - s / 2, s, s);
  }
  ctx.restore();
}

const lerp = (a, b, q) => a + (b - a) * q;
const one = (w, u) => (i) => [w / 2, 24 * u, 15 * u, BASE[i]];
const apart = (w, u) => (i) => {
  const a = (PIECE[i] / 5) * Math.PI * 2 - Math.PI / 2;
  return [w / 2 + Math.cos(a) * 24 * u, 24 * u + Math.sin(a) * 9 * u, 9 * u, BASE[i]];
};
const two = (w, u) => (i) => {
  const g = PIECE[i] < 2 ? 0 : 1;
  return [w / 2 + (g ? 1 : -1) * 20 * u, 24 * u, 15 * u, BALL[g][SLOT[i]]];
};
const blend = (L1, L2, q) => (i) => {
  const a = L1(i);
  const b = L2(i);
  return [lerp(a[0], b[0], q), lerp(a[1], b[1], q), lerp(a[2], b[2], q), q < 0.5 ? a[3] : b[3]];
};

export const scenes = [
  {
    caption: "Take a solid ball. Think of it as made of infinitely many points.",
    duration: 5,
    draw(ctx, w, h, { p, t, u }) {
      ctx.globalAlpha = easeOut(seg(p, 0, 0.3));
      dots(ctx, t, one(w, u), { colored: false });
    },
  },
  {
    caption: "Cut it into five pieces. Not neat slices, but infinitely fine, scattered clouds of points.",
    duration: 6,
    draw(ctx, w, h, { p, t, u }) {
      dots(ctx, t, blend(one(w, u), apart(w, u), ease(seg(p, 0.3, 0.9))), { colored: p > 0.15 });
    },
  },
  {
    caption: "Now only move and rotate the pieces. No stretching, no squashing, no copying.",
    duration: 5.5,
    draw(ctx, w, h, { p, t, u }) {
      dots(ctx, t * 1.6, apart(w, u));
    },
  },
  {
    caption: "Fit them back together, and you get two balls, each exactly the same size as the first!",
    duration: 6,
    draw(ctx, w, h, { p, t, u }) {
      dots(ctx, t, blend(apart(w, u), two(w, u), ease(seg(p, 0.1, 0.75))));
      tag(ctx, "1 ball → 2 balls", w / 2, 45 * u, u, { color: C.white, alpha: seg(p, 0.75, 0.95) });
    },
  },
  {
    caption: "How? The pieces are so scattered that they don’t have a size at all. “Volume” simply doesn’t apply to them.",
    duration: 6.5,
    draw(ctx, w, h, { p, t, u }) {
      dots(ctx, t, apart(w, u));
      title(ctx, w, u, "Volume = ?", { y: 7, size: 4.2, alpha: seg(p, 0.2, 0.5), color: C.yellow });
    },
  },
  {
    caption: "It’s like the infinite hotel: with infinitely many points, you can shuffle them around to make room for more.",
    duration: 6.5,
    draw(ctx, w, h, { p, t, u }) {
      for (let i = 0; i < 10; i++) {
        const shift = ease(seg(p, 0.2, 0.7));
        person(ctx, (14 + (i + shift) * 7.5) * u, 30 * u, u, i === 0 ? C.yellow : C.blue, { alpha: 1 - i * 0.08 });
      }
      text(ctx, "… ∞", 94 * u, 27 * u, { size: 4 * u, align: "right" });
      text(ctx, "room 1 is free", 14 * u, 36 * u, { size: 2.2 * u, color: C.yellow, alpha: seg(p, 0.7, 0.9) });
    },
  },
  {
    caption: "It’s a proven theorem, but you can’t do it with real objects: they’re made of a finite number of atoms.",
    duration: 6,
    draw(ctx, w, h, { p, t, u }) {
      title(ctx, w, u, "True in maths. Impossible with gold.", { y: 20, size: 4.6, alpha: easeOut(seg(p, 0, 0.4)) });
    },
  },
];
