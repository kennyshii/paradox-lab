// Scenes for the liar paradox explainer video.
import { C, seg, ease, easeOut, text, rrect, circle, title, arrow, tag } from "../../assets/js/lib/explainer.js";

const QUOTE = "“This sentence is false.”";

/** A card that flips between TRUE and FALSE; `flip` counts half-turns (fractional = mid-flip). */
function card(ctx, x, y, u, flip, startTrue = true) {
  const k = Math.floor(flip);
  const f = flip - k;
  const isTrue = (k % 2 === 0) === startTrue;
  const sx = Math.abs(Math.cos(Math.PI * f));
  const showTrue = f < 0.5 ? isTrue : !isTrue;
  const col = showTrue ? C.green : C.red;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Math.max(0.02, sx), 1);
  ctx.shadowColor = col;
  ctx.shadowBlur = 30;
  rrect(ctx, -10 * u, -6 * u, 20 * u, 12 * u, 2 * u, { fill: col });
  ctx.shadowBlur = 0;
  text(ctx, showTrue ? "TRUE" : "FALSE", 0, 0.3 * u, { size: 4.6 * u, weight: 900, color: "rgba(0,0,0,0.75)" });
  ctx.restore();
}

export const scenes = [
  {
    caption: "Here’s a sentence: “This sentence is false.” Is it true, or false?",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      text(ctx, QUOTE, w / 2, 22 * u, { size: 6 * u, weight: 800, alpha: easeOut(seg(p, 0, 0.4)) });
    },
  },
  {
    caption: "Suppose it’s true. Then what it says is right… so it’s false.",
    duration: 5.5,
    draw(ctx, w, h, { p, u }) {
      text(ctx, QUOTE, w / 2, 8 * u, { size: 3.2 * u, color: C.dim });
      card(ctx, w / 2, 26 * u, u, ease(seg(p, 0.45, 0.75)), true);
      text(ctx, "if true…", 22 * u, 26 * u, { size: 3 * u, color: C.green, alpha: seg(p, 0, 0.2) });
      text(ctx, "…then false", 78 * u, 26 * u, { size: 3 * u, color: C.red, alpha: seg(p, 0.75, 0.9) });
    },
  },
  {
    caption: "Suppose it’s false. Then what it says is wrong… so it’s true.",
    duration: 5.5,
    draw(ctx, w, h, { p, u }) {
      text(ctx, QUOTE, w / 2, 8 * u, { size: 3.2 * u, color: C.dim });
      card(ctx, w / 2, 26 * u, u, ease(seg(p, 0.45, 0.75)), false);
      text(ctx, "if false…", 22 * u, 26 * u, { size: 3 * u, color: C.red, alpha: seg(p, 0, 0.2) });
      text(ctx, "…then true", 78 * u, 26 * u, { size: 3 * u, color: C.green, alpha: seg(p, 0.75, 0.9) });
    },
  },
  {
    caption: "Every answer turns into its opposite, forever. It can never settle on either.",
    duration: 6,
    draw(ctx, w, h, { p, t, u }) {
      const flip = t * 1.4;
      card(ctx, w / 2, 20 * u, u, flip, true);
      // a square wave of its history
      ctx.strokeStyle = C.white;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let k = 0; k < 16; k++) {
        const x = (14 + k * 4.6) * u;
        const y = (k + Math.floor(flip)) % 2 === 0 ? 34 * u : 39 * u;
        if (k) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        ctx.lineTo(x + 4.6 * u, y);
      }
      ctx.globalAlpha = seg(p, 0.2, 0.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
  },
  {
    caption: "Compare “This sentence is true.” It could be either, and nothing decides. Only the liar is impossible.",
    duration: 6.5,
    draw(ctx, w, h, { p, u }) {
      text(ctx, "“This sentence is true.”", w / 2, 12 * u, { size: 4.2 * u, weight: 800, alpha: seg(p, 0, 0.2) });
      tag(ctx, "TRUE ✓ works", 36 * u, 26 * u, u, { color: C.green, alpha: seg(p, 0.2, 0.4) });
      tag(ctx, "FALSE ✓ works", 64 * u, 26 * u, u, { color: C.green, alpha: seg(p, 0.35, 0.55) });
      text(ctx, "The liar: neither works.", w / 2, 38 * u, { size: 3 * u, color: C.red, alpha: seg(p, 0.65, 0.85) });
    },
  },
  {
    caption: "The trouble is a sentence judging its own truth. Logicians avoid it by keeping sentences and sentences-about-sentences on separate levels.",
    duration: 7,
    draw(ctx, w, h, { p, u }) {
      const levels = [
        ["Level 1", "“Snow is white.”", C.blue],
        ["Level 2", "“The level-1 sentence is true.”", C.teal],
        ["Level 3", "“The level-2 sentence is true.”", C.purple],
      ];
      levels.forEach(([lvl, s, col], i) => {
        const y = (38 - i * 12) * u;
        const a = easeOut(seg(p, i * 0.2, 0.2 + i * 0.2));
        rrect(ctx, 18 * u, y - 4 * u, 64 * u, 8 * u, 2 * u, { fill: "rgba(255,255,255,0.06)", stroke: col, alpha: a });
        text(ctx, lvl, 21 * u, y, { size: 2.2 * u, color: col, align: "left", alpha: a });
        text(ctx, s, 54 * u, y, { size: 2.6 * u, alpha: a });
        if (i) arrow(ctx, 84 * u, y + 2 * u, 84 * u, y + 8 * u, { color: col, alpha: a, width: 2, head: 8 });
      });
    },
  },
];
