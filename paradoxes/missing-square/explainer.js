// Scenes for the missing square explainer video.
import { C, seg, ease, easeOut, text, circle, title, tag } from "../../assets/js/lib/explainer.js";
import { PIECES, HOLE, placed } from "./model.js";

const COLORS = { red: "#ff5a5f", blue: "#3d8bff", green: "#2fd38a", orange: "#ffb020" };

/**
 * Draw the figure at swap progress t (0 = triangle, 1 = with hole), with the long edge's
 * bend exaggerated k times so it can be seen.
 */
function figure(ctx, w, u, { t = 0, k = 1, hole = false, line = false, scale = 5.6, oy = 32 } = {}) {
  const ox = w / 2 - 6.5 * scale * u;
  const L = (x) => (5 / 13) * x;
  const EA = (x) => (x <= 8 ? (3 * x) / 8 : 3 + (2 * (x - 8)) / 5);
  const EB = (x) => (x <= 5 ? (2 * x) / 5 : 2 + (3 * (x - 5)) / 8);
  const E = (x) => (1 - t) * EA(x) + t * EB(x);
  const map = ([x, y]) => {
    const e = E(x);
    const yy = e > 1e-9 ? (y * (L(x) + k * (e - L(x)))) / e : y;
    return [ox + x * scale * u, oy * u - yy * scale * u];
  };
  const poly = (pts) => {
    ctx.beginPath();
    pts.forEach(([x1, y1], i) => {
      const [x2, y2] = pts[(i + 1) % pts.length];
      for (let s = 0; s < 12; s++) {
        const pt = map([x1 + ((x2 - x1) * s) / 12, y1 + ((y2 - y1) * s) / 12]);
        if (i === 0 && s === 0) ctx.moveTo(...pt);
        else ctx.lineTo(...pt);
      }
    });
    ctx.closePath();
  };
  for (const piece of PIECES) {
    poly(placed(piece, t));
    ctx.fillStyle = COLORS[piece.id];
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  if (hole) {
    poly(HOLE);
    ctx.fillStyle = "rgba(255,90,95,0.2)";
    ctx.fill();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "#ff6b78";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (line) {
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, oy * u);
    ctx.lineTo(ox + 13 * scale * u, oy * u - 5 * scale * u);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  return { ox, map };
}

export const scenes = [
  {
    caption: "Four pieces fit together into a neat triangle.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      ctx.globalAlpha = easeOut(seg(p, 0, 0.3));
      figure(ctx, w, u);
    },
  },
  {
    caption: "Rearrange the very same pieces… and suddenly there’s an empty square!",
    duration: 5.5,
    draw(ctx, w, h, { p, u }) {
      const q = ease(seg(p, 0.1, 0.7));
      figure(ctx, w, u, { t: q, hole: q > 0.98 });
    },
  },
  {
    caption: "Same pieces, same area. So where did that square come from?",
    duration: 5,
    draw(ctx, w, h, { p, t, u }) {
      figure(ctx, w, u, { t: 1, hole: true });
      tag(ctx, "?", w / 2 + 25 * u, 8 * u, u, { size: 4, color: C.red, alpha: 0.6 + 0.4 * Math.sin(t * 5) });
    },
  },
  {
    caption: "Look closely at the long edge. It isn’t straight: it bends, just a tiny bit.",
    duration: 6,
    draw(ctx, w, h, { p, u }) {
      const k = 1 + 9 * ease(seg(p, 0.2, 0.8));
      figure(ctx, w, u, { t: 1, hole: true, k, line: p > 0.15 });
      tag(ctx, `bend exaggerated ${Math.round(k)}×`, w / 2, 6 * u, u, { color: C.yellow, size: 2.2, alpha: seg(p, 0.2, 0.4) });
    },
  },
  {
    caption: "The red and blue triangles have different steepness. In one figure the edge sags in; in the other it bulges out.",
    duration: 6.5,
    draw(ctx, w, h, { p, u }) {
      // show the finished triangle, then crossfade to the finished "hole" figure
      const second = p >= 0.5;
      const fade = second ? seg(p, 0.5, 0.62) : 1 - seg(p, 0.38, 0.5);
      ctx.globalAlpha = fade;
      figure(ctx, w, u, { t: second ? 1 : 0, k: 10, line: true, hole: second });
      ctx.globalAlpha = 1;
      text(ctx, second ? "with the hole: the edge bulges out" : "as a triangle: the edge sags in", w / 2, 6 * u, { size: 3 * u, color: C.yellow, alpha: fade });
    },
  },
  {
    caption: "Those thin slivers make up exactly one square. Neither shape was ever a true triangle.",
    duration: 6,
    draw(ctx, w, h, { p, u }) {
      title(ctx, w, u, "Not a triangle at all", { y: 8, size: 4.6, alpha: easeOut(seg(p, 0, 0.3)) });
      figure(ctx, w, u, { t: 1, k: 10, hole: true, line: true, scale: 4.6, oy: 38 });
    },
  },
];
