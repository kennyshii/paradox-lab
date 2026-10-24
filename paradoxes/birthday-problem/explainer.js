// Scenes for the birthday problem explainer video.
import { C, seg, ease, easeOut, text, circle, title, tag, person } from "../../assets/js/lib/explainer.js";

const TAU = Math.PI * 2;

function ringPoints(n, cx, cy, r) {
  return Array.from({ length: n }, (_, i) => [cx + Math.cos(-Math.PI / 2 + (TAU * i) / n) * r, cy + Math.sin(-Math.PI / 2 + (TAU * i) / n) * r]);
}

/** People on a ring with the first `pairs` pair-lines drawn. */
function web(ctx, pts, pairs, { only = null, alpha = 0.35 } = {}) {
  let k = 0;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (k++ >= pairs) break;
      if (only != null && i !== only) continue;
      ctx.strokeStyle = `hsla(${205 + ((i * 7 + j * 3) % 60)}, 95%, 65%, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(...pts[i]);
      ctx.lineTo(...pts[j]);
      ctx.stroke();
    }
  }
  ctx.restore();
  for (const [x, y] of pts) circle(ctx, x, y, 4, { fill: C.white, glow: 10 });
}

export const scenes = [
  {
    caption: "How many people need to be in a room for a 50% chance that two of them share a birthday?",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      for (let i = 0; i < 23; i++) {
        const a = easeOut(seg(p, i * 0.025, 0.2 + i * 0.025));
        person(ctx, (14 + (i % 12) * 6.5) * u, (16 + Math.floor(i / 12) * 11) * u, u, `hsl(${200 + i * 7},80%,65%)`, { alpha: a, scale: 0.9 });
      }
      text(ctx, "?", 88 * u, 22 * u, { size: 10 * u, weight: 800, alpha: seg(p, 0.6, 0.8), color: C.yellow });
    },
  },
  {
    caption: "Most people guess around 180, about half the days in a year. The real answer is just 23.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      const a = seg(p, 0, 0.2);
      text(ctx, "180?", 34 * u, 22 * u, { size: 9 * u, weight: 800, color: C.dim, alpha: a });
      ctx.save();
      ctx.globalAlpha = seg(p, 0.35, 0.5);
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(23 * u, 22 * u);
      ctx.lineTo(45 * u, 22 * u);
      ctx.stroke();
      ctx.restore();
      text(ctx, "23", 66 * u, 22 * u, { size: 14 * u * (0.7 + 0.3 * easeOut(seg(p, 0.5, 0.8))), weight: 800, color: C.yellow, alpha: seg(p, 0.5, 0.7) });
    },
  },
  {
    caption: "The trick: we picture someone matching our own birthday. But any two people in the room can match.",
    duration: 6,
    draw(ctx, w, h, { p, u }) {
      const pts = ringPoints(23, 40 * u, 24 * u, 17 * u);
      web(ctx, pts, seg(p, 0.05, 0.4) * 22, { only: 0, alpha: 0.8 });
      if (p > 0.5) web(ctx, pts, ease(seg(p, 0.5, 0.95)) * 253, { alpha: 0.3 });
      circle(ctx, ...pts[0], 7, { fill: C.yellow, glow: 20 });
      text(ctx, "you", pts[0][0], pts[0][1] - 3 * u, { size: 2.2 * u, color: C.yellow });
      text(ctx, p < 0.5 ? "22 chances to match you" : "every pair can match", 82 * u, 24 * u, { size: 2.6 * u, color: C.dim });
    },
  },
  {
    caption: "23 people make 253 different pairs. Every pair is one more small chance of a match.",
    duration: 6.5,
    draw(ctx, w, h, { p, u }) {
      const pts = ringPoints(23, 38 * u, 24 * u, 17 * u);
      const n = Math.round(ease(seg(p, 0.05, 0.85)) * 253);
      web(ctx, pts, n);
      text(ctx, String(n), 78 * u, 21 * u, { size: 9 * u, weight: 800 });
      text(ctx, "pairs", 78 * u, 28 * u, { size: 3 * u, color: C.dim });
    },
  },
  {
    caption: "Each pair rarely matches, but 253 small chances add up to just over a coin flip.",
    duration: 6,
    draw(ctx, w, h, { p, u }) {
      for (let i = 0; i < 253; i++) {
        const a = seg(p, (i / 253) * 0.5, (i / 253) * 0.5 + 0.1);
        const x = (10 + (i % 23) * 2.2) * u;
        const y = (10 + Math.floor(i / 23) * 2.6) * u;
        circle(ctx, x, y, 0.7 * u, { fill: `hsl(${205 + (i % 60)},90%,65%)`, alpha: a });
      }
      const a = easeOut(seg(p, 0.6, 0.85));
      circle(ctx, 80 * u, 22 * u, 10 * u * a, { fill: C.yellow, glow: 30 });
      text(ctx, "50.7%", 80 * u, 22.5 * u, { size: 4.2 * u * a + 1, weight: 900, color: "#3a2a00", alpha: a });
    },
  },
  {
    caption: "Pairs pile up much faster than people. With 70 people, a shared birthday is almost certain: 99.9%.",
    duration: 6,
    draw(ctx, w, h, { p, u }) {
      const x0 = 18 * u;
      const y0 = 40 * u;
      const W = 64 * u;
      const H = 30 * u;
      ctx.strokeStyle = C.faint;
      ctx.beginPath();
      ctx.moveTo(x0, y0 - H);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x0 + W, y0);
      ctx.stroke();
      const q = ease(seg(p, 0.05, 0.8));
      ctx.lineWidth = 3;
      for (const [f, col, label] of [
        [(n) => n / 2415, C.teal, "70 people"],
        [(n) => (n * (n - 1)) / 2 / 2415, C.yellow, "2,415 pairs"],
      ]) {
        ctx.strokeStyle = col;
        ctx.beginPath();
        for (let n = 1; n <= 70 * q; n++) ctx.lineTo(x0 + (n / 70) * W, y0 - f(n) * H);
        ctx.stroke();
        if (q > 0.95) text(ctx, label, x0 + W + 2 * u, y0 - f(70) * H + (label === "70 people" ? -1 * u : 1 * u), { size: 2.4 * u, color: col, align: "left" });
      }
      text(ctx, "people →", x0 + W / 2, y0 + 3 * u, { size: 2 * u, color: C.dim });
      tag(ctx, "70 people: 99.9%", 50 * u, 6 * u, u, { color: C.yellow, alpha: seg(p, 0.8, 0.95) });
    },
  },
];
