// Scenes for the barber / Russell's paradox explainer video.
import { C, seg, ease, easeOut, text, rrect, circle, title, arrow, tag, person } from "../../assets/js/lib/explainer.js";

const VILLAGERS = [true, false, true, false, false];

function razor(ctx, x, y, u, alpha = 1) {
  rrect(ctx, x - 0.4 * u, y - 2.6 * u, 0.8 * u, 2.6 * u, 0.3 * u, { fill: C.dim, alpha });
  rrect(ctx, x - 1.4 * u, y - 3.4 * u, 2.8 * u, 0.9 * u, 0.3 * u, { fill: C.white, alpha });
}

function barber(ctx, x, y, u, color = C.orange) {
  person(ctx, x, y, u, color, { scale: 1.3 });
  rrect(ctx, x - 2 * u, y - 8.1 * u, 4 * u, 1.2 * u, 0.4 * u, { fill: C.red });
}

function loop(ctx, cx, cy, A, q, u) {
  ctx.strokeStyle = C.faint;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = 0; k <= 120; k++) {
    const a = (k / 120) * Math.PI * 2;
    const x = cx + A * Math.sin(a);
    const y = cy + A * 0.42 * Math.sin(a) * Math.cos(a);
    if (k) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  const a = q * Math.PI * 2;
  circle(ctx, cx + A * Math.sin(a), cy + A * 0.42 * Math.sin(a) * Math.cos(a), 1.2 * u, { fill: C.white, glow: 24 });
}

export const scenes = [
  {
    caption: "In a village, the barber shaves everyone who doesn’t shave themselves, and nobody else.",
    duration: 5.5,
    draw(ctx, w, h, { p, u }) {
      VILLAGERS.forEach((self, i) => {
        const x = (16 + i * 13) * u;
        const a = easeOut(seg(p, i * 0.08, 0.3 + i * 0.08));
        person(ctx, x, 26 * u, u, self ? C.teal : C.purple, { alpha: a });
        text(ctx, self ? "shaves himself" : "barber does it", x, 30.5 * u, { size: 1.6 * u, color: C.dim, alpha: seg(p, 0.5, 0.7) });
        if (!self) arrow(ctx, 86 * u, 14 * u, x + 2 * u, 20 * u, { color: C.orange, alpha: seg(p, 0.6, 0.8) * 0.6, width: 1.5, head: 7, bend: 0.1 });
        else razor(ctx, x + 3 * u, 22 * u, u, a);
      });
      barber(ctx, 88 * u, 14 * u, u);
    },
  },
  {
    caption: "So who shaves the barber?",
    duration: 4,
    draw(ctx, w, h, { p, t, u }) {
      barber(ctx, w / 2, 30 * u, u * 1.4);
      text(ctx, "?", w / 2 + 7 * u, 14 * u, { size: 8 * u, weight: 800, color: C.yellow, alpha: seg(p, 0.2, 0.4) });
    },
  },
  {
    caption: "If he shaves himself, he’s a man who shaves himself, and the barber never shaves those. So he mustn’t.",
    duration: 6,
    draw(ctx, w, h, { p, u }) {
      barber(ctx, 30 * u, 30 * u, u);
      razor(ctx, 33 * u, 26 * u, u, seg(p, 0, 0.2));
      tag(ctx, "shaves himself", 30 * u, 36 * u, u, { color: C.green, size: 2.2 });
      arrow(ctx, 40 * u, 24 * u, 60 * u, 24 * u, { alpha: seg(p, 0.3, 0.5), color: C.white });
      tag(ctx, "✗ not allowed", 72 * u, 24 * u, u, { color: C.red, alpha: seg(p, 0.5, 0.7) });
    },
  },
  {
    caption: "If he doesn’t, he’s a man who doesn’t shave himself, so the barber must shave him. So he must.",
    duration: 6,
    draw(ctx, w, h, { p, u }) {
      barber(ctx, 30 * u, 30 * u, u);
      tag(ctx, "doesn’t shave himself", 30 * u, 36 * u, u, { color: C.red, size: 2.2 });
      arrow(ctx, 40 * u, 24 * u, 60 * u, 24 * u, { alpha: seg(p, 0.3, 0.5), color: C.white });
      tag(ctx, "✗ he must!", 72 * u, 24 * u, u, { color: C.red, alpha: seg(p, 0.5, 0.7) });
    },
  },
  {
    caption: "Each answer forces the other, round and round. The only way out: such a barber can’t exist.",
    duration: 6,
    draw(ctx, w, h, { p, t, u }) {
      loop(ctx, w / 2, 22 * u, 30 * u, (t * 0.35) % 1, u);
      text(ctx, "shaves", w / 2 + 19 * u, 22 * u, { size: 2.6 * u, color: C.green });
      text(ctx, "doesn’t", w / 2 - 19 * u, 22 * u, { size: 2.6 * u, color: C.red });
      title(ctx, w, u, "No such barber", { y: 40, size: 4.2, alpha: seg(p, 0.55, 0.8), color: C.yellow });
    },
  },
  {
    caption: "Bertrand Russell found the same trap inside mathematics: the collection of all collections that don’t contain themselves.",
    duration: 7,
    draw(ctx, w, h, { p, u }) {
      // boxes inside boxes; the big one asks whether it belongs inside itself
      const a = easeOut(seg(p, 0, 0.3));
      rrect(ctx, 22 * u, 6 * u, 56 * u, 34 * u, 3 * u, { stroke: C.purple, lineWidth: 3, alpha: a });
      text(ctx, "R", 26 * u, 10 * u, { size: 3.4 * u, color: C.purple, align: "left", alpha: a });
      for (let i = 0; i < 4; i++) {
        const b = easeOut(seg(p, 0.15 + i * 0.1, 0.3 + i * 0.1));
        rrect(ctx, (28 + i * 12) * u, 18 * u, 9 * u, 9 * u, 1.5 * u, { stroke: C.teal, alpha: b });
      }
      text(ctx, "Does R belong inside R?", w / 2, 34 * u, { size: 3 * u, color: C.yellow, alpha: seg(p, 0.65, 0.85) });
    },
  },
  {
    caption: "It shook the foundations of mathematics, which were rebuilt with stricter rules about which collections are allowed.",
    duration: 6,
    draw(ctx, w, h, { p, u }) {
      for (let i = 0; i < 5; i++) {
        const a = easeOut(seg(p, i * 0.12, 0.25 + i * 0.12));
        rrect(ctx, (24 + i * 10.5) * u, (38 - a * 10) * u - (i % 2) * 6 * u, 9.5 * u, 6 * u, 1 * u, { fill: `hsl(${260 + i * 18},70%,60%)`, alpha: a });
      }
      title(ctx, w, u, "New rules for sets", { y: 12, size: 4.6, alpha: seg(p, 0.5, 0.8) });
    },
  },
];
