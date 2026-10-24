// Scenes for the Monty Hall explainer video.
import { C, seg, ease, easeOut, text, rrect, circle, title, tag } from "../../assets/js/lib/explainer.js";

const XS = [30, 50, 70];

function goat(ctx, x, y, u) {
  ctx.save();
  ctx.fillStyle = "#e9e4da";
  ctx.beginPath();
  ctx.ellipse(x, y, 3.2 * u, 1.8 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 3.2 * u, y - 1.8 * u, 1.3 * u, 1.1 * u, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e9e4da";
  ctx.lineWidth = 0.6 * u;
  for (const lx of [-2, -0.8, 1, 2.2]) {
    ctx.beginPath();
    ctx.moveTo(x + lx * u, y + u);
    ctx.lineTo(x + lx * u, y + 3.2 * u);
    ctx.stroke();
  }
  ctx.strokeStyle = "#b9b0a0";
  ctx.beginPath();
  ctx.moveTo(x + 3 * u, y - 2.6 * u);
  ctx.quadraticCurveTo(x + 2.4 * u, y - 4.4 * u, x + 1.4 * u, y - 4 * u);
  ctx.stroke();
  ctx.restore();
}

function car(ctx, x, y, u) {
  rrect(ctx, x - 4.4 * u, y - 1.2 * u, 8.8 * u, 2.6 * u, 1 * u, { fill: C.red });
  rrect(ctx, x - 2.6 * u, y - 3 * u, 5 * u, 2 * u, [1.2 * u, 1.2 * u, 0, 0], { fill: C.red });
  circle(ctx, x - 2.6 * u, y + 1.5 * u, 0.9 * u, { fill: "#111", stroke: C.dim, lineWidth: 1 });
  circle(ctx, x + 2.6 * u, y + 1.5 * u, 0.9 * u, { fill: "#111", stroke: C.dim, lineWidth: 1 });
}

/** A door at column x (in u) that swings open by `open` (0..1) to reveal `prize`. */
function door(ctx, x, u, { open = 0, prize = "goat", ring = null, label = "" } = {}) {
  const w = 12 * u;
  const hh = 22 * u;
  const left = x * u - w / 2;
  const top = 8 * u;
  rrect(ctx, left, top, w, hh, [u, u, 0, 0], { fill: "#0c0c12", stroke: ring ?? C.faint, lineWidth: ring ? 3 : 1.5 });
  if (open > 0.3) (prize === "car" ? car : goat)(ctx, x * u, top + hh * 0.62, u);
  if (open < 1) {
    const ww = w * (1 - open * 0.85);
    const g = ctx.createLinearGradient(left, top, left + ww, top + hh);
    g.addColorStop(0, "#4c7cff");
    g.addColorStop(1, "#3a2bb8");
    rrect(ctx, left, top, ww, hh, [u, u, 0, 0], { fill: g });
    text(ctx, label, left + ww / 2, top + hh * 0.45, { size: 4 * u * (1 - open), weight: 800 });
  }
}

export const scenes = [
  {
    caption: "Three doors. Behind one is a car; behind the other two, goats. You pick door 1.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      XS.forEach((x, i) => door(ctx, x, u, { label: String(i + 1), ring: i === 0 && p > 0.5 ? C.blue : null }));
      text(ctx, "your pick", XS[0] * u, 34 * u, { size: 2.4 * u, color: C.blue, alpha: seg(p, 0.5, 0.7) });
    },
  },
  {
    caption: "Your door has a 1 in 3 chance. The two other doors, together, hold the other 2 in 3.",
    duration: 5.5,
    draw(ctx, w, h, { p, u }) {
      XS.forEach((x, i) => door(ctx, x, u, { label: String(i + 1), ring: i === 0 ? C.blue : null }));
      tag(ctx, "1 in 3", XS[0] * u, 36 * u, u, { color: C.blue, alpha: seg(p, 0.1, 0.3) });
      const a = seg(p, 0.4, 0.6);
      rrect(ctx, 42 * u, 6 * u, 36 * u, 26 * u, 2 * u, { stroke: C.yellow, lineWidth: 2.5, alpha: a });
      tag(ctx, "2 in 3", 60 * u, 36 * u, u, { color: C.yellow, alpha: a });
    },
  },
  {
    caption: "The host knows where the car is. He opens one of the other doors, and it’s always a goat.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      door(ctx, XS[0], u, { label: "1", ring: C.blue });
      door(ctx, XS[1], u, { label: "2" });
      door(ctx, XS[2], u, { label: "3", open: ease(seg(p, 0.3, 0.7)) });
    },
  },
  {
    caption: "That tells you nothing new about your door: he could always find a goat to show. Your door is still 1 in 3.",
    duration: 6,
    draw(ctx, w, h, { p, t, u }) {
      door(ctx, XS[0], u, { label: "1", ring: C.blue });
      door(ctx, XS[1], u, { label: "2" });
      door(ctx, XS[2], u, { label: "3", open: 1 });
      tag(ctx, "still 1 in 3", XS[0] * u, 36 * u, u, { color: C.blue, size: 2.6 + 0.15 * Math.sin(t * 4) });
    },
  },
  {
    caption: "But the 2 in 3 that belonged to both other doors now rests on the one door he left shut.",
    duration: 6,
    draw(ctx, w, h, { p, u }) {
      door(ctx, XS[0], u, { label: "1", ring: C.blue });
      door(ctx, XS[1], u, { label: "2", ring: p > 0.6 ? C.yellow : null });
      door(ctx, XS[2], u, { label: "3", open: 1 });
      tag(ctx, "1 in 3", XS[0] * u, 36 * u, u, { color: C.blue });
      const q = ease(seg(p, 0.15, 0.65));
      const x = 42 + (44 - 42) * q;
      const wd = 36 - (36 - 12) * q;
      rrect(ctx, x * u, 6 * u, wd * u, 26 * u, 2 * u, { stroke: C.yellow, lineWidth: 2.5 });
      tag(ctx, "2 in 3", (60 - 10 * q) * u, 36 * u, u, { color: C.yellow });
    },
  },
  {
    caption: "Still not sure? Imagine 100 doors. You pick one, and the host opens 98 doors, all goats.",
    duration: 6.5,
    draw(ctx, w, h, { p, u }) {
      const s = 3.2 * u;
      const x0 = w / 2 - 5 * s * 1.25;
      for (let i = 0; i < 100; i++) {
        const cx = x0 + (i % 10) * s * 1.25;
        const cy = 6 * u + Math.floor(i / 10) * s * 1.15;
        const mine = i === 0;
        const left = i === 63;
        const opened = !mine && !left && seg(p, 0.25 + (i / 100) * 0.5, 0.3 + (i / 100) * 0.5) > 0.5;
        rrect(ctx, cx, cy, s * 0.95, s * 0.9, 2, { fill: opened ? "#15151c" : mine ? C.blue : left && p > 0.8 ? C.yellow : "#4c5cff", alpha: opened ? 0.6 : 1 });
      }
    },
  },
  {
    caption: "Would you keep your 1 in 100, or take the one door he carefully avoided? Switching wins 2 out of 3 times with three doors.",
    duration: 6.5,
    draw(ctx, w, h, { p, u }) {
      title(ctx, w, u, "Switch.", { y: 18, size: 10, alpha: easeOut(seg(p, 0, 0.3)), color: C.yellow });
      text(ctx, "Staying wins 1 in 3   ·   Switching wins 2 in 3", w / 2, 32 * u, { size: 3 * u, color: C.dim, alpha: seg(p, 0.3, 0.6) });
    },
  },
];
