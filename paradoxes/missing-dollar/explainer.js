// Scenes for the missing dollar explainer video.
import { C, seg, text, title, easeOut } from "../../assets/js/lib/explainer.js";
import { drawMoney } from "./scene.js";

const money = (from, to, mode, a = 0, b = 1) => (ctx, w, h, { p, t, u }) => drawMoney(ctx, w, h, { from, to, q: seg(p, a, b), u, t, mode });

export const scenes = [
  {
    caption: "Three friends check into a hotel. The room costs $30, so they put in $10 each.",
    duration: 5,
    draw: money(0, 0),
  },
  {
    caption: "They hand all $30 to the hotel desk.",
    duration: 4.5,
    draw: money(0, 1, null, 0.1, 0.9),
  },
  {
    caption: "Later the manager realises the room was only $25, and sends the bellhop with $5 in change.",
    duration: 5.5,
    draw: money(1, 2, null, 0.2, 0.9),
  },
  {
    caption: "Five dollars won’t split three ways, so the bellhop pockets $2 and gives each friend $1 back.",
    duration: 5.5,
    draw: money(2, 3, null, 0.15, 0.85),
  },
  {
    caption: "Now each friend paid $9. Three times $9 is $27, plus the bellhop’s $2 makes $29. Where did the last dollar go?",
    duration: 7,
    draw: money(3, 3, "wrong", 0.2, 0.8),
  },
  {
    caption: "Look where the friends’ $27 actually is: $25 in the hotel’s till and $2 in the bellhop’s pocket.",
    duration: 6.5,
    draw: money(3, 3, "highlight", 0.1, 0.6),
  },
  {
    caption: "So adding the bellhop’s $2 to the $27 counts that $2 twice. The honest sum is $25 + $2 + $3 = $30.",
    duration: 6.5,
    draw: money(3, 3, "highlight", 0, 0.01),
  },
  {
    caption: "Nothing went missing. The riddle just adds up numbers that don’t belong together.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      const a = easeOut(seg(p, 0, 0.4));
      title(ctx, w, u, "$25 + $2 + $3 = $30", { y: 22, size: 7, alpha: a, color: C.green });
      text(ctx, "not  $27 + $2", w / 2, 36 * u, { size: 4 * u, weight: 700, color: C.red, alpha: seg(p, 0.3, 0.6) });
      ctx.save();
      ctx.globalAlpha = seg(p, 0.45, 0.7);
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 14 * u, 36 * u);
      ctx.lineTo(w / 2 + 14 * u, 36 * u);
      ctx.stroke();
      ctx.restore();
    },
  },
];
