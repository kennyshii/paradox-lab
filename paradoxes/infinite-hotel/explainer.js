// Scenes for the Infinite Hotel explainer video.
import { C, seg, ease, easeOut, back, text, rrect, circle, arrow, title } from "../../assets/js/lib/explainer.js";

const N = 9;

function layout(w, h, u) {
  const rw = 10.2 * u;
  const x0 = w / 2 - 3.2 * rw;
  return { rw, x0, floor: h * 0.7, dw: 7 * u, dh: 16 * u, xOf: (r) => x0 + (r - 1) * rw };
}

function guest(ctx, x, y, u0, color, alpha = 1) {
  const u = u0 * 1.25;
  circle(ctx, x, y - 3.3 * u, 1.15 * u, { fill: color, alpha, glow: 14 });
  rrect(ctx, x - 1.3 * u, y - 2 * u, 2.6 * u, 2.4 * u, [u, u, 0.3 * u, 0.3 * u], { fill: color, alpha });
}

function rooms(ctx, w, h, u, { glow = () => false, label = true } = {}) {
  const L = layout(w, h, u);
  for (let r = 1; r <= N; r++) {
    const x = L.xOf(r);
    const g = glow(r);
    ctx.save();
    if (g) {
      ctx.shadowColor = C.yellow;
      ctx.shadowBlur = 30 * g;
    }
    rrect(ctx, x - L.dw / 2, L.floor - L.dh, L.dw, L.dh, [u, u, 0, 0], { fill: g ? `rgba(255,214,10,${0.2 + 0.25 * g})` : "#232533", stroke: g ? C.yellow : C.faint, lineWidth: 1.5 });
    ctx.restore();
    if (label) text(ctx, String(r), x, L.floor - L.dh - 2.2 * u, { size: 2.2 * u, color: g ? C.yellow : C.dim });
  }
  return L;
}

/** The corridor fades into infinity (drawn last, over any guests). */
function edge(ctx, w, h, u) {
  const L = layout(w, h, u);
  const f = ctx.createLinearGradient(w * 0.78, 0, w, 0);
  f.addColorStop(0, "rgba(0,0,0,0)");
  f.addColorStop(1, "rgba(0,0,0,0.95)");
  ctx.fillStyle = f;
  ctx.fillRect(w * 0.78, 0, w * 0.22, h);
  text(ctx, "… ∞", w - 3 * u, L.floor - L.dh / 2, { size: 4 * u, align: "right", weight: 800 });
}

/** Guests hopping from room `from(r)` to `to(r)` with progress q. */
function hop(ctx, L, u, q, to, color = C.yellow) {
  for (let r = 1; r <= N + 2; r++) {
    const local = ease(seg(q, (r - 1) * 0.04, 0.6 + (r - 1) * 0.04));
    const fx = L.xOf(r);
    const tx = L.xOf(to(r));
    const x = fx + (tx - fx) * local;
    const y = L.floor - 0.6 * u - Math.sin(Math.PI * local) * (5 * u + Math.abs(tx - fx) * 0.12);
    guest(ctx, x, y, u, color);
  }
}

export const scenes = [
  {
    caption: "Picture a hotel with infinitely many rooms. Tonight, every single one is taken.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      title(ctx, w, u, "The Infinite Hotel", { alpha: easeOut(seg(p, 0, 0.3)) });
      const L = rooms(ctx, w, h, u);
      for (let r = 1; r <= N; r++) {
        const a = back(seg(p, 0.15 + r * 0.05, 0.35 + r * 0.05));
        if (a > 0) guest(ctx, L.xOf(r), L.floor - 0.6 * u, u * a, C.yellow);
      }
      edge(ctx, w, h, u);
    },
  },
  {
    caption: "A new guest arrives. The sign says FULL. Is there any room?",
    duration: 4.5,
    draw(ctx, w, h, { p, t, u }) {
      const L = rooms(ctx, w, h, u);
      for (let r = 1; r <= N; r++) guest(ctx, L.xOf(r), L.floor - 0.6 * u, u, C.yellow);
      const gx = L.xOf(0) - 4 * u + (1 - easeOut(seg(p, 0, 0.4))) * -12 * u;
      guest(ctx, gx, L.floor - 0.6 * u, u, C.pink);
      const blink = seg(p, 0.35, 0.5) * (0.6 + 0.4 * Math.sin(t * 8));
      rrect(ctx, w / 2 - 9 * u, 6 * u, 18 * u, 7 * u, 1.5 * u, { stroke: C.red, lineWidth: 3, alpha: blink });
      text(ctx, "FULL", w / 2, 9.6 * u, { size: 4.6 * u, weight: 900, color: C.red, alpha: blink });
      text(ctx, "?", gx, L.floor - 9 * u, { size: 4 * u, alpha: seg(p, 0.5, 0.7) });
      edge(ctx, w, h, u);
    },
  },
  {
    caption: "The manager has an idea: everyone moves to the next room up. 1 goes to 2, 2 goes to 3, and so on.",
    duration: 6,
    draw(ctx, w, h, { p, u }) {
      title(ctx, w, u, "Everyone moves up one room", { alpha: easeOut(seg(p, 0, 0.2)), size: 4.2 });
      const L = rooms(ctx, w, h, u);
      for (let r = 1; r <= 3; r++) arrow(ctx, L.xOf(r) + u, L.floor - L.dh - 5 * u, L.xOf(r + 1) - u, L.floor - L.dh - 5 * u, { color: C.yellow, alpha: seg(p, 0.05, 0.2) * (1 - seg(p, 0.85, 1)), width: 2, head: 8, bend: 0.25 });
      hop(ctx, L, u, seg(p, 0.2, 0.95), (r) => r + 1);
      guest(ctx, L.xOf(0) - 4 * u, L.floor - 0.6 * u, u, C.pink);
      edge(ctx, w, h, u);
    },
  },
  {
    caption: "Nobody is left out, because there’s always a next room. And now room 1 is free!",
    duration: 4.5,
    draw(ctx, w, h, { p, t, u }) {
      const L = rooms(ctx, w, h, u, { glow: (r) => (r === 1 ? (1 - seg(p, 0.6, 0.9)) * (0.6 + 0.4 * Math.sin(t * 6)) : 0) });
      for (let r = 2; r <= N; r++) guest(ctx, L.xOf(r), L.floor - 0.6 * u, u, C.yellow);
      const q = ease(seg(p, 0.35, 0.8));
      const sx = L.xOf(0) - 4 * u;
      guest(ctx, sx + (L.xOf(1) - sx) * q, L.floor - 0.6 * u - Math.sin(Math.PI * q) * 5 * u, u, C.pink);
      title(ctx, w, u, "Room for one more ✓", { alpha: seg(p, 0.8, 1), color: C.green, size: 4.4 });
      edge(ctx, w, h, u);
    },
  },
  {
    caption: "Then an infinite bus pulls up, carrying infinitely many new guests.",
    duration: 5,
    draw(ctx, w, h, { p, u }) {
      const L = rooms(ctx, w, h, u);
      for (let r = 1; r <= N; r++) guest(ctx, L.xOf(r), L.floor - 0.6 * u, u, r === 1 ? C.pink : C.yellow);
      const bx = w * 0.05 + (1 - easeOut(seg(p, 0, 0.5))) * -40 * u;
      const by = h * 0.705;
      rrect(ctx, bx, by, 30 * u, 8 * u, 2 * u, { fill: C.blue });
      for (let k = 0; k < 6; k++) rrect(ctx, bx + 2 * u + k * 4.6 * u, by + 1.2 * u, 3.6 * u, 3 * u, 0.6 * u, { fill: "rgba(255,255,255,0.75)" });
      circle(ctx, bx + 6 * u, by + 8 * u, 1.8 * u, { fill: "#111", stroke: C.dim });
      circle(ctx, bx + 24 * u, by + 8 * u, 1.8 * u, { fill: "#111", stroke: C.dim });
      text(ctx, "∞ passengers", bx + 33 * u, by + 1.5 * u, { size: 2.6 * u, alpha: seg(p, 0.5, 0.7), color: C.blue, align: "left" });
      for (let k = 0; k < 14; k++) guest(ctx, bx + 32 * u + k * 3.4 * u, by + 7 * u, u * 0.8, C.blue, seg(p, 0.55 + k * 0.02, 0.65 + k * 0.02) * (1 - k / 16));
      edge(ctx, w, h, u);
    },
  },
  {
    caption: "This time, everyone doubles their room number: 1 goes to 2, 2 goes to 4, 3 goes to 6…",
    duration: 6.5,
    draw(ctx, w, h, { p, t, u }) {
      title(ctx, w, u, "Everyone doubles their room number", { alpha: easeOut(seg(p, 0, 0.2)), size: 4 });
      const L = rooms(ctx, w, h, u, { glow: (r) => (r % 2 ? seg(p, 0.75, 0.9) * (0.6 + 0.4 * Math.sin(t * 6)) : 0) });
      for (let r = 1; r <= 3; r++) arrow(ctx, L.xOf(r) + u, L.floor - L.dh - 5 * u, L.xOf(2 * r) - u, L.floor - L.dh - 5 * u, { color: C.yellow, alpha: seg(p, 0.05, 0.2) * (1 - seg(p, 0.8, 1)), width: 2, head: 8, bend: 0.22 });
      hop(ctx, L, u, seg(p, 0.15, 0.85), (r) => 2 * r);
      edge(ctx, w, h, u);
    },
  },
  {
    caption: "All the odd-numbered rooms are now empty, infinitely many of them. The bus passengers move in.",
    duration: 5,
    draw(ctx, w, h, { p, t, u }) {
      const L = rooms(ctx, w, h, u, { glow: (r) => (r % 2 ? (1 - seg(p, 0.3, 0.8)) * (0.6 + 0.4 * Math.sin(t * 6)) : 0) });
      for (let r = 2; r <= N; r += 2) guest(ctx, L.xOf(r), L.floor - 0.6 * u, u, C.yellow);
      for (let r = 1; r <= N; r += 2) {
        const q = ease(seg(p, 0.1 + r * 0.03, 0.6 + r * 0.03));
        const sx = w * 0.1 + r * 2 * u;
        const sy = h * 0.82;
        guest(ctx, sx + (L.xOf(r) - sx) * q, sy + (L.floor - 0.6 * u - sy) * q - Math.sin(Math.PI * q) * 6 * u, u, C.blue);
      }
      title(ctx, w, u, "Still full. Everyone has a room.", { alpha: seg(p, 0.85, 1), color: C.green, size: 4.2 });
      edge(ctx, w, h, u);
    },
  },
  {
    caption: "In an infinite hotel, “full” doesn’t mean “no room”. Infinity isn’t just a very big number; it plays by its own rules.",
    duration: 6.5,
    draw(ctx, w, h, { p, t, u }) {
      const a = easeOut(seg(p, 0, 0.4));
      ctx.save();
      ctx.shadowColor = C.purple;
      ctx.shadowBlur = 40;
      text(ctx, "∞", w / 2, h * 0.36, { size: 26 * u * (0.8 + 0.2 * a) + Math.sin(t * 2) * u, weight: 300, alpha: a, color: C.white });
      ctx.restore();
      text(ctx, "∞ + 1 = ∞      ∞ + ∞ = ∞", w / 2, h * 0.66, { size: 3.6 * u, alpha: seg(p, 0.35, 0.6), color: C.dim, weight: 600 });
    },
  },
];
