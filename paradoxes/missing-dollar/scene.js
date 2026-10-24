// Draws the missing-dollar story as 30 one-dollar coins moving between people.
// Shared by the lab (stepped by the user) and the explainer video.
import { C, text, rrect, circle, ease } from "../../assets/js/lib/explainer.js";
import { coinPlaces } from "./model.js";

const FRIENDS = [C.pink, C.teal, C.purple];

function holderXY(holder, u) {
  if (holder === "desk") return [48 * u, 19 * u];
  if (holder === "bell") return [80 * u, 19 * u];
  const k = Number(holder[1]);
  return [13 * u, (9 + k * 11.5) * u];
}

function coinXY({ holder, slot }, u) {
  const [x, y] = holderXY(holder, u);
  if (holder === "desk") return [x - 7 * u + Math.floor(slot / 5) * 2.8 * u, y + 7 * u - (slot % 5) * 0.75 * u];
  if (holder === "bell") return [x + 6.5 * u, y + 2.2 * u - slot * 0.75 * u];
  return [x + 7 * u, y + 2.2 * u - slot * 0.75 * u];
}

function coin(ctx, x, y, u, color = C.yellow) {
  ctx.save();
  ctx.fillStyle = color === C.yellow ? "#9a7400" : "#167a4a";
  ctx.beginPath();
  ctx.ellipse(x, y + 0.35 * u, 1.15 * u, 0.48 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.ellipse(x, y, 1.15 * u, 0.48 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function person(ctx, x, y, u, color, label, cap = false) {
  circle(ctx, x, y - 3 * u, 1.6 * u, { fill: color, glow: 14 });
  rrect(ctx, x - 2 * u, y - 1.2 * u, 4 * u, 3.6 * u, [1.6 * u, 1.6 * u, 0.4 * u, 0.4 * u], { fill: color });
  if (cap) rrect(ctx, x - 1.8 * u, y - 5.3 * u, 3.6 * u, 1.1 * u, 0.4 * u, { fill: C.red });
  text(ctx, label, x, y + 4.6 * u, { size: 1.8 * u, weight: 600, color: C.dim });
}

/**
 * f: { from, to, q, u, t, mode } — animate coins from step `from` to step `to` with progress q.
 * mode: "highlight" colours the friends' $27 vs the $3 returned; "wrong" shows the bogus sum.
 */
export function drawMoney(ctx, w, h, { from, to, q, u, t = 0, mode = null }) {
  // centre the 100-unit-wide scene in the frame
  ctx.translate((w - 100 * u) / 2, 0);
  const A = coinPlaces(from);
  const B = coinPlaces(to);
  const live = q > 0.6 ? B : A;

  // people and the desk
  FRIENDS.forEach((c, k) => person(ctx, ...holderXY(`f${k}`, u), u, c, `Friend ${k + 1}`));
  const [dx, dy] = holderXY("desk", u);
  rrect(ctx, dx - 10 * u, dy + 8.6 * u, 20 * u, 3 * u, 0.8 * u, { fill: "#2a2c3a", stroke: C.faint });
  text(ctx, "HOTEL DESK", dx, dy + 10.1 * u, { size: 1.5 * u, weight: 700, color: C.dim });
  person(ctx, ...holderXY("bell", u), u, C.orange, "Bellhop", true);

  // coins, back to front
  const coins = A.map((a, i) => {
    const b = B[i];
    const moving = a.holder !== b.holder || a.slot !== b.slot;
    const local = moving ? ease(Math.min(1, Math.max(0, q * 1.4 - (i % 10) * 0.04))) : 1;
    const [ax, ay] = coinXY(a, u);
    const [bx, by] = coinXY(b, u);
    const lift = moving ? Math.sin(Math.PI * local) * 7 * u : 0;
    let color = C.yellow;
    if (mode === "highlight" && b.holder.startsWith("f")) color = C.green;
    return { x: ax + (bx - ax) * local, y: ay + (by - ay) * local - lift, color };
  });
  coins.sort((a, b) => b.y - a.y).forEach((c) => coin(ctx, c.x, c.y, u, c.color));

  // amounts under each holder
  const count = (hld) => live.filter((p) => p.holder === hld).length;
  for (const hld of ["f0", "f1", "f2"]) {
    const [x, y] = holderXY(hld, u);
    text(ctx, `$${count(hld)}`, x + 7 * u, y + 4.6 * u, { size: 2.2 * u, weight: 800, color: C.yellow, alpha: count(hld) ? 1 : 0.3 });
  }
  text(ctx, `$${count("desk")}`, dx, dy - 6.5 * u, { size: 3 * u, weight: 800, color: C.yellow });
  const [bx, by] = holderXY("bell", u);
  text(ctx, `$${count("bell")}`, bx + 6.5 * u, by + 5.4 * u, { size: 3 * u, weight: 800, color: C.yellow, alpha: count("bell") ? 1 : 0.3 });

  if (mode === "highlight") {
    const a = Math.min(1, q * 2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = C.yellow;
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(dx - 11 * u, dy - 10 * u, 51 * u, 23 * u, 2 * u);
    ctx.stroke();
    ctx.restore();
    text(ctx, "the $27 the friends paid = $25 + $2", dx + 14.5 * u, dy + 16 * u, { size: 2.2 * u, weight: 700, color: C.yellow, alpha: a });
    text(ctx, "+ $3 back = $30 ✓", 20 * u, 41 * u, { size: 2.2 * u, weight: 700, color: C.green, alpha: a });
  }
  if (mode === "wrong") {
    // a ghost copy of the bellhop's $2 jumps onto the friends' $27
    const k = ease(Math.min(1, q * 1.6));
    for (let s = 0; s < 2; s++) {
      const [sx, sy] = coinXY({ holder: "bell", slot: s }, u);
      const tx = 30 * u + s * 2.6 * u;
      const ty = 37 * u;
      ctx.globalAlpha = 0.85;
      coin(ctx, sx + (tx - sx) * k, sy + (ty - sy) * k - Math.sin(Math.PI * k) * 8 * u, u, C.yellow);
      ctx.globalAlpha = 1;
    }
    const a = Math.min(1, Math.max(0, (q - 0.5) * 3));
    text(ctx, "$9 × 3 = $27,  + $2 = $29 ?", 50 * u, 41 * u, { size: 2.6 * u, weight: 800, color: C.red, alpha: a });
  }
}
