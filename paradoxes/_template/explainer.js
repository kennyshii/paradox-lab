// Scenes for the explainer video. Each scene has a caption (shown as subtitles and in the
// transcript), a duration in seconds, and a draw function. Coordinates use `u`, 1% of a
// 16:9 frame's width; keep drawings above y = 44u so the captions don't cover them.
import { C, seg, easeOut, text, title, circle } from "../../assets/js/lib/explainer.js";

export const scenes = [
  {
    caption: "Set the scene in one plain sentence.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      title(ctx, w, u, "Your paradox", { y: 20, alpha: easeOut(seg(p, 0, 0.4)) });
    },
  },
  {
    caption: "Show the surprising part, one idea per scene.",
    duration: 5,
    draw(ctx, w, h, { p, t, u }) {
      circle(ctx, w / 2, 24 * u, 8 * u * easeOut(seg(p, 0, 0.5)), { fill: C.blue, glow: 30 });
      text(ctx, "!", w / 2, 24 * u, { size: 8 * u, alpha: seg(p, 0.5, 0.7) });
    },
  },
];
