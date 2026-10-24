import { mountPage } from "../../assets/js/page.js";
import { $, h, bindRange } from "../../assets/js/lib/dom.js";
import { fmt } from "../../assets/js/lib/format.js";
import { stageCanvas } from "../../assets/js/lib/fx.js";
import { prefersReducedMotion } from "../../assets/js/lib/sim.js";
import { explainer } from "../../assets/js/lib/explainer.js";
import { PLANS, applyPlan, freeRooms } from "./model.js";
import { scenes } from "./explainer.js";

mountPage();

const SIZE = 400; // rooms we track; everything beyond is "full", exactly like the real infinite hotel
const COLORS = { orig: "#ffd60a", new: "#ff4fa3", 1: "#2997ff", 2: "#32d583", 3: "#bf5af2" };

let rooms = Array.from({ length: SIZE }, (_, i) => ({ group: "orig", id: i + 1 }));
let lastPlan = null;
let anim = null; // { start, moves, arrivals, next, plan }
let cam = 0;
let camTarget = 0;

function reset() {
  rooms = Array.from({ length: SIZE }, (_, i) => ({ group: "orig", id: i + 1 }));
  lastPlan = null;
  anim = null;
  renderReadouts();
}

// ---------- Drawing ----------

const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

function person(ctx, x, y, s, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(x, y - s * 1.55, s * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - s * 0.55, y - s * 0.95, s * 1.1, s * 1.05, [s * 0.5, s * 0.5, s * 0.15, s * 0.15]);
  ctx.fill();
  ctx.restore();
}

const corridor = stageCanvas($("#corridor"), {
  aspect: 16 / 7,
  minHeight: 280,
  maxHeight: 440,
  animate: true,
  label: "A corridor of hotel rooms, every one occupied.",
  draw(ctx, w, hh, t) {
    cam += (camTarget - cam) * 0.12;
    const RW = Math.max(62, Math.min(96, w / 11));
    const doorW = RW * 0.62;
    const doorH = Math.min(hh * 0.5, doorW * 2.1);
    const floorY = hh * (w < 600 ? 0.6 : 0.74);
    const x0 = RW * 1.6; // room 1 sits after the lobby
    const xOf = (room) => x0 + (room - 1 - cam) * RW;
    const s = doorW * 0.2;

    // floor and wall
    const floor = ctx.createLinearGradient(0, floorY, 0, hh);
    floor.addColorStop(0, "rgba(255,255,255,0.08)");
    floor.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = floor;
    ctx.fillRect(0, floorY, w, hh - floorY);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, floorY - doorH - 46, w, doorH + 46);

    // lobby
    const lobbyX = xOf(0) - RW * 0.3;
    if (lobbyX > -RW * 2) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.roundRect(lobbyX - RW * 0.6, floorY - doorH * 0.45, RW * 1.1, doorH * 0.45, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "700 11px -apple-system, Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LOBBY", lobbyX - RW * 0.05, floorY - doorH * 0.2);
    }

    const p = anim ? (performance.now() - anim.start) / 1000 : 0;
    const moveP = anim ? easeInOut(Math.min(1, p / 1.8)) : 1;
    const holding = anim && p > 1.8 && p < 2.6;
    const arriveP = anim ? easeInOut(Math.min(1, Math.max(0, (p - 2.6) / 1.6))) : 1;

    const first = Math.max(1, Math.floor(cam) - 1);
    const last = Math.min(SIZE, Math.ceil(cam + w / RW) + 1);
    const occupied = anim ? anim.next : rooms;

    // doors
    for (let r = first; r <= last; r++) {
      const x = xOf(r);
      const free = anim ? !anim.next[r - 1] || (anim.arrivals.some((a) => a.to === r) && arriveP < 1) : !rooms[r - 1];
      const glow = free && (holding || (anim && arriveP < 1 && p > 1.8));
      ctx.save();
      if (glow) {
        ctx.shadowColor = "#ffd60a";
        ctx.shadowBlur = 24 + 10 * Math.sin(t * 6);
      }
      const g = ctx.createLinearGradient(x - doorW / 2, 0, x + doorW / 2, 0);
      g.addColorStop(0, glow ? "#5a4a10" : "#2a2c3a");
      g.addColorStop(1, glow ? "#3a300a" : "#1a1b25");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x - doorW / 2, floorY - doorH, doorW, doorH, [8, 8, 0, 0]);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = glow ? "#ffd60a" : "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - doorW / 2, floorY - doorH, doorW, doorH);
      // number plate
      ctx.fillStyle = glow ? "#ffd60a" : "rgba(255,255,255,0.75)";
      ctx.font = `700 ${Math.max(11, RW * 0.17)}px -apple-system, Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(fmt(r), x, floorY - doorH - 12);
      if (glow) {
        ctx.font = "800 10px -apple-system, Inter, sans-serif";
        ctx.fillText("FREE", x, floorY - doorH / 2);
      }
      // resting guest (not animating)
      if (!anim && occupied[r - 1]) person(ctx, x, floorY - 6, s, COLORS[occupied[r - 1].group]);
    }

    // moving guests: hop along arcs from their old room to their new one
    if (anim) {
      for (const m of anim.moves) {
        const fx = xOf(m.from);
        const tx = xOf(Math.min(m.to, SIZE + 50));
        if (Math.max(fx, tx) < -RW || Math.min(fx, tx) > w + RW) continue;
        const local = Math.max(0, Math.min(1, moveP * 1.15 - (m.from - first) * 0.004));
        const x = fx + (tx - fx) * local;
        const lift = Math.sin(Math.PI * local) * Math.min(doorH * 0.8, 30 + Math.abs(tx - fx) * 0.15);
        person(ctx, x, floorY - 6 - lift, s, COLORS[m.guest.group]);
      }
      // newcomers walk in from the lobby (or a bus)
      anim.arrivals.forEach((a, i) => {
        const sx = lobbyX - RW * 0.4 - (i % 6) * s * 1.6;
        const tx = xOf(a.to);
        const local = Math.max(0, Math.min(1, arriveP * 1.3 - Math.min(i, 30) * 0.01));
        const x = sx + (tx - sx) * local;
        const lift = Math.sin(Math.PI * local) * Math.min(doorH, 40 + Math.abs(tx - sx) * 0.12);
        person(ctx, x, floorY - 6 - lift, s, COLORS[a.guest.group], local > 0 || p > 1.6 ? 1 : 0.5);
      });
    }

    // the corridor goes on forever
    const fade = ctx.createLinearGradient(w * 0.82, 0, w, 0);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = fade;
    ctx.fillRect(w * 0.82, 0, w * 0.18, hh);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "800 30px -apple-system, Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("… ∞", w - 18, floorY - doorH / 2);
  },
});

// ---------- Plans ----------

function run(key) {
  if (anim) return;
  const plan = PLANS[key];
  const result = applyPlan(rooms, plan, (b, m) => ({ group: plan.arrivals === Infinity ? b : "new", id: `${b}-${m}` }));
  lastPlan = plan;
  camTarget = 0;
  $("#walk").value = 0;
  syncWalk();
  if (prefersReducedMotion()) {
    rooms = result.rooms;
    renderReadouts();
    return;
  }
  anim = { start: performance.now(), plan, next: result.rooms, moves: result.moves, arrivals: result.arrivals };
  setTimeout(finish, 4400);
  $("#corridor").scrollIntoView({ block: "nearest", behavior: "smooth" });
  for (const b of $("#plans").children) b.disabled = true;
  $("#rule").textContent = `${plan.rule} That frees ${plan.freed}…`;
  $("#hud-free").textContent = plan.freed.split(" (")[0].replace("infinitely many rooms", "∞").replace(" rooms", "").replace(" room", "");
}

function finish() {
  if (!anim) return;
  rooms = anim.next;
  anim = null;
  for (const b of $("#plans").children) b.disabled = false;
  renderReadouts();
}

function renderReadouts() {
  const free = freeRooms(rooms);
  $("#hud-free").textContent = free.length ? (free.length > 50 ? "∞" : String(free.length)) : "0";
  $("#rule").textContent = lastPlan
    ? `${lastPlan.rule} ${free.length ? `Some rooms stay empty (like ${free.slice(0, 4).join(", ")}…), yet everyone has a bed.` : "Everyone has a room again, and the hotel is still exactly full."}`
    : "Every room is taken. Pick who arrives, then watch the manager make room. Drag the corridor to walk along it.";
  corridor.setLabel(`A corridor of hotel rooms. ${free.length ? `${free.length > 50 ? "Infinitely many" : free.length} rooms are empty.` : "Every room is occupied."}`);
  renderAsk();
}

function renderAsk() {
  const n = Math.max(1, Math.floor(Number($("#ask").value) || 1));
  const out = $("#ask-out");
  if (!lastPlan) {
    out.innerHTML = `The guest in room <strong>${fmt(n)}</strong> is fast asleep. Choose an arrival above, then ask again.`;
    return;
  }
  const to = lastPlan.move(n);
  const big = !Number.isFinite(to) || to > 1e15;
  out.innerHTML = big
    ? `The guest from room <strong>${fmt(n)}</strong> moved to room 2<sup>${fmt(n)}</sup>: a gigantic number, but a perfectly real room.`
    : `The guest from room <strong>${fmt(n)}</strong> now sleeps in room <strong>${fmt(to)}</strong>. Every guest gets an answer like this, so nobody is left without a room.`;
}

$("#plans").replaceChildren(
  ...Object.entries(PLANS).map(([key, plan], i) => h("button", { type: "button", class: `btn${i === 0 ? " btn-primary" : ""}`, on: { click: () => run(key) } }, plan.label)),
);
$("#reset").addEventListener("click", () => {
  if (!anim) reset();
});
$("#ask").addEventListener("input", renderAsk);

const syncWalk = bindRange($("#walk"), {
  output: $("#walk-out"),
  format: (v) => `room ${fmt(Math.floor(v) + 1)}`,
  onInput(v) {
    camTarget = v;
  },
});

// Drag the corridor to walk along it.
let drag = null;
const stageEl = $("#corridor");
stageEl.addEventListener("pointerdown", (e) => {
  drag = { x: e.clientX, cam: camTarget };
  stageEl.setPointerCapture(e.pointerId);
});
stageEl.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const RW = Math.max(62, Math.min(96, stageEl.clientWidth / 11));
  camTarget = Math.max(0, Math.min(120, drag.cam - (e.clientX - drag.x) / RW));
  $("#walk").value = camTarget;
  syncWalk();
});
stageEl.addEventListener("pointerup", () => (drag = null));

reset();
explainer($("[data-explainer]"), { title: "Hilbert’s infinite hotel, explained", scenes });
