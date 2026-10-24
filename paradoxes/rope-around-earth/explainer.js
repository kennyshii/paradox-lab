// Scenes for the rope-around-the-Earth explainer video.
import { C, seg, ease, easeOut, text, circle, rrect, title, arrow, tag } from "../../assets/js/lib/explainer.js";

function planet(ctx, x, y, r, a = "#5ab8ff", b = "#0b3a8c") {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  circle(ctx, x, y, r, { fill: g });
}

function rope(ctx, x, y, r, { from = 0, to = Math.PI * 2, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#ffb15e";
  ctx.shadowColor = "#ffb15e";
  ctx.shadowBlur = 14;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2 + from, -Math.PI / 2 + to);
  ctx.stroke();
  ctx.restore();
}

function cat(ctx, x, y, s, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.ellipse(x, y - 1.6 * s, 2.6 * s, 1.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 2.6 * s, y - 3.2 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 1.8 * s, y - 4 * s);
  ctx.lineTo(x + 2.1 * s, y - 5.2 * s);
  ctx.lineTo(x + 2.6 * s, y - 4.2 * s);
  ctx.moveTo(x + 2.8 * s, y - 4.2 * s);
  ctx.lineTo(x + 3.4 * s, y - 5.2 * s);
  ctx.lineTo(x + 3.6 * s, y - 3.9 * s);
  ctx.fill();
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 0.6 * s;
  ctx.beginPath();
  ctx.moveTo(x - 2.4 * s, y - 2 * s);
  ctx.quadraticCurveTo(x - 4.5 * s, y - 3 * s, x - 3.6 * s, y - 5 * s);
  ctx.stroke();
  ctx.restore();
}

const CX = 50;
const CY = 25;
const R = 15;

export const scenes = [
  {
    caption: "Imagine wrapping a rope snugly around the Earth’s equator: about 40,000 km of rope.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      planet(ctx, CX * u, CY * u, R * u);
      rope(ctx, CX * u, CY * u, R * u + 1.5, { to: Math.PI * 2 * ease(seg(p, 0.1, 0.8)) });
      tag(ctx, "40,000 km", CX * u, (CY + R + 4) * u, u, { alpha: seg(p, 0.7, 0.9), color: "#ffb15e" });
    },
  },
  {
    caption: "Now add just one metre to the rope, and lift it so it floats evenly all the way round.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      planet(ctx, CX * u, CY * u, R * u);
      const gap = 3 * u * ease(seg(p, 0.3, 0.8));
      rope(ctx, CX * u, CY * u, R * u + 1.5 + gap);
      tag(ctx, "+ 1 m", (CX + 22) * u, (CY - 12) * u, u, { alpha: seg(p, 0, 0.3), color: "#ffb15e" });
    },
  },
  {
    caption: "How big is the gap under the rope? Most people guess something tiny, thinner than a hair.",
    duration: 5.5,
    draw(ctx, w, h, { p, u }) {
      planet(ctx, CX * u, CY * u, R * u);
      rope(ctx, CX * u, CY * u, R * u + 3 * u);
      text(ctx, "a hair’s width?", (CX + 26) * u, (CY - 6) * u, { size: 2.8 * u, color: C.dim, alpha: seg(p, 0.1, 0.3) * (1 - seg(p, 0.55, 0.65)) });
      const a = seg(p, 0.6, 0.8);
      text(ctx, "about 16 cm", (CX + 27) * u, (CY - 6) * u, { size: 4 * u, weight: 800, color: "#ffb15e", alpha: a });
      cat(ctx, (CX + 27) * u, (CY + 4) * u, 1.3 * u, a);
      text(ctx, "a cat could crawl under it", (CX + 27) * u, (CY + 7) * u, { size: 2 * u, color: C.dim, alpha: a });
    },
  },
  {
    caption: "Here’s the key: push a circle outward a little, and its length grows by about six times that amount.",
    duration: 6.5,
    draw(ctx, w, h, { p, u }) {
      title(ctx, w, u, "Lift it a bit → about 6× more rope", { size: 3.6, alpha: seg(p, 0, 0.2) });
      const x0 = 18 * u;
      const y = 30 * u;
      const g = 5 * u;
      // a stretch of ground and rope seen up close
      rrect(ctx, x0, y, 64 * u, 1 * u, 0.5 * u, { fill: "#2a5bb0" });
      ctx.strokeStyle = "#ffb15e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0, y - g);
      ctx.lineTo(x0 + 64 * u, y - g);
      ctx.stroke();
      arrow(ctx, x0 + 4 * u, y, x0 + 4 * u, y - g + 0.3 * u, { color: C.white, width: 2, head: 6 });
      text(ctx, "lift", x0 + 4 * u, y + 3 * u, { size: 2 * u, color: C.dim });
      // six copies of the lift laid end to end = the extra rope
      for (let k = 0; k < 6; k++) {
        const a = easeOut(seg(p, 0.3 + k * 0.07, 0.4 + k * 0.07));
        rrect(ctx, x0 + 12 * u + k * 6.4 * u, y - g - 5 * u, g * a, 1.4 * u, 0.6 * u, { fill: C.yellow, alpha: a });
      }
      text(ctx, "extra rope needed = 6 lifts", x0 + 30 * u, y - g - 9 * u, { size: 2 * u, color: C.yellow, alpha: seg(p, 0.75, 0.9) });
    },
  },
  {
    caption: "So one metre of extra rope only has to cover six lifts. One metre split six ways is about 16 cm.",
    duration: 5.5,
    draw(ctx, w, h, { p, u }) {
      const x0 = 20 * u;
      const y = 22 * u;
      const L = 60 * u;
      for (let k = 0; k < 6; k++) {
        const split = ease(seg(p, 0.25, 0.6));
        rrect(ctx, x0 + (k * L) / 6 + split * k * 0.8 * u, y, L / 6 - 0.4 * u, 3 * u, 0.8 * u, { fill: k === 0 && p > 0.65 ? C.yellow : "#ffb15e" });
      }
      text(ctx, "1 metre of rope", w / 2, y - 4 * u, { size: 2.6 * u, color: C.dim });
      text(ctx, "÷ 6  ≈  16 cm", w / 2, y + 10 * u, { size: 5 * u, weight: 800, color: C.yellow, alpha: seg(p, 0.6, 0.85) });
    },
  },
  {
    caption: "Notice that rule never mentions the size of the planet. A football, the Earth, the Sun: always 16 cm.",
    duration: 6.5,
    draw(ctx, w, h, { p, t, u }) {
      const sizes = [
        [4, "#ffb066", "#c4511a", "Football"],
        [15, "#5ab8ff", "#0b3a8c", "Earth"],
        [19, "#fff4c2", "#ff8a00", "Sun"],
      ];
      const k = Math.min(2, Math.floor(p * 3));
      const local = (p * 3) % 1;
      const [r, a, b, name] = sizes[k];
      const rr = r * u * (0.85 + 0.15 * easeOut(Math.min(1, local * 3)));
      const cy = CY * u;
      planet(ctx, CX * u, cy, rr, a, b);
      rope(ctx, CX * u, cy, rr + 2.4 * u);
      text(ctx, name, 14 * u, 12 * u, { size: 3.4 * u, align: "left" });
      tag(ctx, "gap: 16 cm", 86 * u, 12 * u, u, { color: "#ffb15e" });
    },
  },
  {
    caption: "Our gut compares one metre to the giant rope. But the gap only depends on the extra rope, never on the planet.",
    duration: 5.5,
    draw(ctx, w, h, { p, u }) {
      title(ctx, w, u, "The gap ignores the planet", { y: 20, size: 6, alpha: easeOut(seg(p, 0, 0.4)) });
      text(ctx, "extra rope ÷ 6 ≈ the gap", w / 2, 32 * u, { size: 3.4 * u, color: C.yellow, alpha: seg(p, 0.3, 0.6) });
    },
  },
];
