import { mountPage } from "../../assets/js/page.js";
import { $, bindRange, segmented } from "../../assets/js/lib/dom.js";
import { svg } from "../../assets/js/lib/chart.js";
import { tween } from "../../assets/js/lib/sim.js";
import { fmt } from "../../assets/js/lib/format.js";
import { WIDTH, HEIGHT, PIECES, HOLE, SLIVERS, area, placed } from "./model.js";
import { explainer } from "../../assets/js/lib/explainer.js";
import { scenes as explainerScenes } from "./explainer.js";

mountPage();

const COLORS = { red: "#ff5a5f", blue: "#3d8bff", green: "#2fd38a", orange: "#ffb020" };
const LIGHT = { red: "#ff9a8a", blue: "#8fc2ff", green: "#8ff0c0", orange: "#ffe08a" };
const state = { t: 0, k: 1, showLine: false, showSliver: false, busy: false, pieceT: null };

// The "hypotenuse" is really two segments. E(x) is its height in each arrangement, L(x) the true diagonal.
const L = (x) => (HEIGHT / WIDTH) * x;
const E_A = (x) => (x <= 8 ? (3 * x) / 8 : 3 + (2 * (x - 8)) / 5);
const E_B = (x) => (x <= 5 ? (2 * x) / 5 : 2 + (3 * (x - 5)) / 8);
const E = (x) => (1 - state.t) * E_A(x) + state.t * E_B(x);

// Exaggerate the bend: stretch each vertical column so the edge sits k times further from the diagonal.
function map([x, y]) {
  const e = E(x);
  if (e <= 1e-9) return [x, y];
  const target = L(x) + state.k * (e - L(x));
  return [x, (y * target) / e];
}

const PAD = 0.7;
const board = $("#board");
board.setAttribute("viewBox", `${-PAD} ${-PAD} ${WIDTH + 2 * PAD} ${HEIGHT + 2 * PAD}`);
// Flip y so the maths (y up) maps to SVG (y down).
const toSvg = ([x, y]) => `${x.toFixed(4)},${(HEIGHT - y).toFixed(4)}`;
// Subdivide edges before mapping: the bend map is not linear, so straight edges must be sampled.
function densify(pts, closed = true, steps = 24) {
  const out = [];
  const count = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < count; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    for (let s = 0; s < steps; s++) out.push([x1 + ((x2 - x1) * s) / steps, y1 + ((y2 - y1) * s) / steps]);
  }
  if (!closed) out.push(pts.at(-1));
  return out;
}
const polyline = (pts, closed = true) => densify(pts, closed).map((p) => toSvg(map(p))).join(" ");

const NS = { "vector-effect": "non-scaling-stroke" };

function draw() {
  board.replaceChildren();
  const defs = svg("defs", {}, board);
  for (const id of Object.keys(COLORS)) {
    const lg = svg("linearGradient", { id: `grad-${id}`, x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    svg("stop", { offset: 0, style: { stopColor: LIGHT[id] } }, lg);
    svg("stop", { offset: 1, style: { stopColor: COLORS[id] } }, lg);
  }
  const g = svg("g", { id: "board-art" }, board);

  // pieces (each one may be at its own point of the swap, for a staggered motion)
  PIECES.forEach((piece, i) => {
    const t = state.pieceT ? state.pieceT[i] : state.t;
    const pts = placed(piece, t);
    const lift = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 0.25;
    svg("polygon", { points: polyline(pts), ...NS, style: { fill: `url(#grad-${piece.id})`, stroke: "rgba(0,0,0,0.55)", strokeWidth: 1.2, strokeLinejoin: "round", filter: lift > 0.01 ? `drop-shadow(0 ${lift}px ${lift * 2}px rgba(0,0,0,0.6))` : "none" } }, g);
    const [lx, ly] = map([piece.labelAt[0] + piece.shift[0] * t, piece.labelAt[1] + piece.shift[1] * t]);
    svg("text", { x: lx, y: HEIGHT - ly + 0.17, "text-anchor": "middle", text: piece.label, style: { fontSize: "0.5px", fontWeight: 800, fill: "rgba(0,0,0,0.7)" } }, g);
  });

  // unit grid drawn over the pieces (clipped to the figure) so squares can be counted
  const clip = svg("clipPath", { id: "figure-clip" }, defs);
  const outline = [[0, 0], [WIDTH, 0], [WIDTH, HEIGHT], ...(state.t < 0.5 ? [[8, 3]] : [[5, 2]])];
  svg("polygon", { points: state.t === 0 || state.t === 1 ? polyline(outline) : `0,0 ${WIDTH},0 ${WIDTH},${HEIGHT} 0,${HEIGHT}` }, clip);
  const grid = svg("g", { "clip-path": "url(#figure-clip)", style: { stroke: "#000", strokeOpacity: 0.28, strokeWidth: 0.8, fill: "none" } }, g);
  for (let y = 1; y < HEIGHT; y++) svg("polyline", { points: polyline([[0, y], [WIDTH, y]], false), ...NS }, grid);
  for (let x = 1; x < WIDTH; x++) svg("polyline", { points: polyline([[x, 0], [x, HEIGHT]], false), ...NS }, grid);

  // the hole in arrangement B
  if (state.t > 0.98) {
    svg("polygon", { points: polyline(HOLE), ...NS, class: "hole", style: { fill: "rgba(255,90,95,0.12)", stroke: "#ff6b78", strokeWidth: 2, strokeDasharray: "5 4" } }, g);
    const [hx, hy] = map([10.5, 0.5]);
    svg("text", { x: hx, y: HEIGHT - hy + 0.2, "text-anchor": "middle", text: "?", style: { fontSize: "0.6px", fontWeight: 800, fill: "#ff6b78" } }, g);
  }

  // sliver between the bent edge and the true diagonal (drawn in exaggerated space)
  const which = state.t < 0.5 ? "A" : "B";
  if (state.showSliver && (state.t === 0 || state.t === 1)) {
    const [p0, bend, p2] = SLIVERS[which];
    svg("polygon", { points: [p0, map(bend), p2].map(toSvg).join(" "), ...NS, style: { fill: "#ff375f", fillOpacity: 0.55, stroke: "#ff375f", strokeWidth: 1 } }, g);
  }
  if (state.showLine) {
    svg("line", { x1: 0, y1: HEIGHT, x2: WIDTH, y2: 0, ...NS, style: { stroke: "#fff", strokeWidth: 1.5, strokeDasharray: "6 4" } }, g);
  }

  const atRest = state.t === 0 || state.t === 1;
  const label = !atRest ? "Pieces moving between arrangements." : which === "A" ? "Arrangement 1: all four pieces fill the triangle, no gaps." : "Arrangement 2: the same pieces, with a one-square hole.";
  $("#board-desc").textContent = `${label}${state.k > 1 ? ` The bend is exaggerated ${fmt(state.k, 1)}×.` : ""}`;
}

function renderTable() {
  const pieceArea = PIECES.reduce((s, p) => s + area(p.points), 0);
  const rows = PIECES.map((p) => `<tr><td><span class="swatch" style="background:${COLORS[p.id]}"></span>${p.label}: ${p.name}</td><td>${fmt(area(p.points), 1)}</td></tr>`).join("");
  $("#area-table").innerHTML = `
    <caption class="visually-hidden">Area accounting</caption>
    <thead><tr><th scope="col">Shape</th><th scope="col">Area (squares)</th></tr></thead>
    <tbody>${rows}
      <tr class="total"><td><strong>All four pieces</strong></td><td><strong>${fmt(pieceArea)}</strong></td></tr>
      <tr><td>A true 13 × 5 triangle</td><td>${fmt((WIDTH * HEIGHT) / 2, 1)}</td></tr>
      <tr><td>Arrangement 1 outline (bends in)</td><td>${fmt((WIDTH * HEIGHT) / 2 - area(SLIVERS.A), 1)}</td></tr>
      <tr><td>Arrangement 2 outline (bends out)</td><td>${fmt((WIDTH * HEIGHT) / 2 + area(SLIVERS.B), 1)} = 32 + hole</td></tr>
    </tbody>`;
}

const arrangement = segmented($("[data-arrangement]"), { onChange: (v) => goTo(v === "A" ? 0 : 1) });

async function goTo(target) {
  if (state.busy || state.t === target) return;
  state.busy = true;
  arrangement.set(target === 0 ? "A" : "B", { silent: true });
  const from = state.t;
  // Each piece starts a little after the previous one and settles with a slight overshoot.
  const back = (x) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
  await tween(
    1900,
    (p) => {
      state.t = from + (target - from) * p;
      state.pieceT = PIECES.map((_, i) => {
        const local = Math.min(1, Math.max(0, (p - i * 0.12) / 0.64));
        return from + (target - from) * back(local);
      });
      draw();
    },
    (x) => x,
  );
  state.t = target;
  state.pieceT = null;
  state.busy = false;
  draw();
}

$("#animate").addEventListener("click", () => goTo(state.t < 0.5 ? 1 : 0));
bindRange($("#k"), {
  output: $("#k-out"),
  format: (v) => (v === 1 ? "true scale" : `${fmt(v, 1)}×`),
  onInput(v) {
    state.k = v;
    draw();
  },
});
$("#show-line").addEventListener("change", (e) => {
  state.showLine = e.target.checked;
  draw();
});
$("#show-sliver").addEventListener("change", (e) => {
  state.showSliver = e.target.checked;
  draw();
});

// ---------- Magnifying lens ----------

const lens = $("#lens");
const stageBox = $("#board-stage");
const ZOOM = 9;
function moveLens(e) {
  const r = board.getBoundingClientRect();
  const vb = board.viewBox.baseVal;
  const ux = vb.x + ((e.clientX - r.left) / r.width) * vb.width;
  const uy = vb.y + ((e.clientY - r.top) / r.height) * vb.height;
  const size = lens.clientWidth;
  const span = (size / r.width) * vb.width / ZOOM;
  lens.setAttribute("viewBox", `${ux - span / 2} ${uy - span / 2} ${span} ${span}`);
  const sb = stageBox.getBoundingClientRect();
  lens.style.transform = `translate(${e.clientX - sb.left - size / 2}px, ${e.clientY - sb.top - size / 2}px)`;
  stageBox.classList.add("is-lensing");
}
const trueLine = $("#lens-true");
Object.entries({ x1: 0, y1: HEIGHT, x2: WIDTH, y2: 0, "vector-effect": "non-scaling-stroke" }).forEach(([k, v]) => trueLine.setAttribute(k, v));
board.addEventListener("pointermove", moveLens);
board.addEventListener("pointerdown", moveLens);
board.addEventListener("pointerleave", () => stageBox.classList.remove("is-lensing"));

renderTable();
draw();

explainer($("[data-explainer]"), { title: $("[data-explainer]").dataset.title, scenes: explainerScenes });
