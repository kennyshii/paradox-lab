// Scenes for Zeno's dichotomy explainer video.
import { C, seg, ease, easeOut, text, rrect, circle, title, person } from "../../assets/js/lib/explainer.js";

const X0 = 12;
const X1 = 88;
const Y = 30;
const half = (k) => 1 - 0.5 ** k;

function room(ctx, u, pos, marks, { alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = C.faint;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(X0 * u, Y * u);
  ctx.lineTo(X1 * u, Y * u);
  ctx.stroke();
  rrect(ctx, X1 * u, (Y - 11) * u, 2 * u, 11 * u, 0.4 * u, { fill: C.orange });
  text(ctx, "door", (X1 + 1) * u, (Y + 3) * u, { size: 2 * u, color: C.dim });
  for (let k = 1; k <= marks; k++) {
    const x = (X0 + (X1 - X0) * half(k)) * u;
    ctx.strokeStyle = C.blue;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, (Y - 2 / Math.sqrt(k)) * u);
    ctx.lineTo(x, (Y + 2 / Math.sqrt(k)) * u);
    ctx.stroke();
  }
  person(ctx, (X0 + (X1 - X0) * pos) * u, Y * u, u, C.pink);
  ctx.restore();
}

/** The halves stacked into a square: tile k is half of what's left. */
function tiles(ctx, u, x0, y0, S, count, { labels = true } = {}) {
  let x = x0;
  let y = y0;
  let w = S;
  let h = S;
  ctx.strokeStyle = C.faint;
  ctx.strokeRect(x0, y0, S, S);
  for (let i = 0; i < 14; i++) {
    let rx;
    let ry;
    let rw;
    let rh;
    if (i % 2 === 0) {
      rw = w / 2;
      rh = h;
      rx = x;
      ry = y;
      x += rw;
      w = rw;
    } else {
      rw = w;
      rh = h / 2;
      rx = x;
      ry = y + rh;
      h = rh;
    }
    const a = Math.max(0, Math.min(1, count - i));
    if (a <= 0) continue;
    rrect(ctx, rx + 1, ry + 1, rw - 2, rh - 2, 3, { fill: `hsl(${210 + i * 22},90%,62%)`, alpha: a });
    if (labels && i < 3) text(ctx, ["½", "¼", "⅛"][i], rx + rw / 2, ry + rh / 2, { size: Math.min(rw, rh) / 3, weight: 800, color: "rgba(0,0,0,0.6)", alpha: a });
  }
}

export const scenes = [
  {
    caption: "To walk across a room, first you have to reach the halfway point.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      room(ctx, u, 0.5 * ease(seg(p, 0.2, 0.8)), p > 0.8 ? 1 : 0);
      text(ctx, "½", (X0 + (X1 - X0) * 0.5) * u, (Y + 5) * u, { size: 3 * u, color: C.blue, alpha: seg(p, 0.8, 1) });
    },
  },
  {
    caption: "Then halfway through what’s left. Then halfway again. And again, and again…",
    duration: 6,
    draw(ctx, w, h, { p, u }) {
      const k = 1 + p * 7;
      const pos = half(Math.floor(k)) + (half(Math.floor(k) + 1) - half(Math.floor(k))) * ease(k % 1);
      room(ctx, u, pos, Math.floor(k));
    },
  },
  {
    caption: "That’s infinitely many steps. How can anyone ever finish infinitely many steps?",
    duration: 5.5,
    draw(ctx, w, h, { p, t, u }) {
      room(ctx, u, half(9), 12, { alpha: 0.5 });
      ctx.save();
      ctx.shadowColor = C.purple;
      ctx.shadowBlur = 30;
      text(ctx, "∞ steps?", w / 2, 14 * u, { size: 8 * u * (0.9 + 0.1 * easeOut(seg(p, 0, 0.4))), weight: 800, alpha: seg(p, 0, 0.3) });
      ctx.restore();
    },
  },
  {
    caption: "But each step is shorter, and takes less time. Stack the halves side by side…",
    duration: 6.5,
    draw(ctx, w, h, { p, u }) {
      const S = 34 * u;
      tiles(ctx, u, w / 2 - S / 2, 5 * u, S, seg(p, 0.05, 0.95) * 10);
    },
  },
  {
    caption: "…and they fill exactly one whole square. Infinitely many pieces, but one finite total.",
    duration: 6,
    draw(ctx, w, h, { p, t, u }) {
      const S = 34 * u;
      tiles(ctx, u, w / 2 - S / 2, 5 * u, S, 14);
      const a = seg(p, 0.3, 0.6);
      rrect(ctx, w / 2 - S / 2, 5 * u, S, S, 4, { stroke: C.white, lineWidth: 3, alpha: a });
      text(ctx, "= 1", w / 2 + S / 2 + 8 * u, 22 * u, { size: 7 * u, weight: 800, color: C.yellow, alpha: a });
    },
  },
  {
    caption: "So you arrive right on time. The infinity was only in how we chopped up the trip, not in the trip itself.",
    duration: 6,
    draw(ctx, w, h, { p, u }) {
      room(ctx, u, ease(seg(p, 0.05, 0.6)), 10);
      text(ctx, "arrived ✓", X1 * u, (Y - 15) * u, { size: 3 * u, color: C.green, alpha: seg(p, 0.6, 0.8) });
    },
  },
];
