import { mountPage } from "../../assets/js/page.js";
import { $, bindRange, segmented } from "../../assets/js/lib/dom.js";
import { svg } from "../../assets/js/lib/chart.js";
import { tween } from "../../assets/js/lib/sim.js";
import { fmt } from "../../assets/js/lib/format.js";
import { WIDTH, HEIGHT, PIECES, HOLE, SLIVERS, area, placed } from "./model.js";

mountPage();

const COLORS = { red: "#e45b4b", blue: "#4f86ea", green: "#3faa76", orange: "#eeaa3c" };
const state = { t: 0, k: 1, showLine: false, showSliver: false, busy: false };

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

function draw() {
  board.replaceChildren();
  const g = svg("g", {}, board);

  // pieces
  for (const piece of PIECES) {
    const pts = placed(piece, state.t);
    svg("polygon", { points: polyline(pts), style: { fill: COLORS[piece.id], stroke: "var(--ink)", strokeWidth: 0.06, strokeLinejoin: "round" } }, g);
    const [lx, ly] = map([piece.labelAt[0] + piece.shift[0] * state.t, piece.labelAt[1] + piece.shift[1] * state.t]);
    svg("text", { x: lx, y: HEIGHT - ly + 0.17, "text-anchor": "middle", text: piece.label, style: { fontSize: "0.5px", fontWeight: 700, fill: "#1c1b18" } }, g);
  }

  // unit grid drawn over the pieces (clipped to the figure) so squares can be counted
  const clip = svg("clipPath", { id: "figure-clip" }, svg("defs", {}, board));
  const outline = [[0, 0], [WIDTH, 0], [WIDTH, HEIGHT], ...(state.t < 0.5 ? [[8, 3]] : [[5, 2]])];
  svg("polygon", { points: state.t === 0 || state.t === 1 ? polyline(outline) : `0,0 ${WIDTH},0 ${WIDTH},${HEIGHT} 0,${HEIGHT}` }, clip);
  const grid = svg("g", { "clip-path": "url(#figure-clip)", style: { stroke: "var(--ink)", strokeOpacity: 0.25, strokeWidth: 0.025, fill: "none" } }, g);
  for (let y = 1; y < HEIGHT; y++) svg("polyline", { points: polyline([[0, y], [WIDTH, y]], false) }, grid);
  for (let x = 1; x < WIDTH; x++) svg("polyline", { points: polyline([[x, 0], [x, HEIGHT]], false) }, grid);

  // the hole in arrangement B
  if (state.t > 0.98) {
    svg("polygon", { points: polyline(HOLE), style: { fill: "var(--surface)", stroke: "var(--bad)", strokeWidth: 0.07, strokeDasharray: "0.15 0.1" } }, g);
    const [hx, hy] = map([10.5, 0.5]);
    svg("text", { x: hx, y: HEIGHT - hy + 0.2, "text-anchor": "middle", text: "?", style: { fontSize: "0.6px", fontWeight: 800, fill: "var(--bad)" } }, g);
  }

  // sliver between the bent edge and the true diagonal (drawn in exaggerated space)
  const which = state.t < 0.5 ? "A" : "B";
  if (state.showSliver && (state.t === 0 || state.t === 1)) {
    const [p0, bend, p2] = SLIVERS[which];
    svg("polygon", { points: [p0, map(bend), p2].map(toSvg).join(" "), style: { fill: "var(--bad)", fillOpacity: 0.35, stroke: "var(--bad)", strokeWidth: 0.04 } }, g);
  }
  if (state.showLine) {
    svg("line", { x1: 0, y1: HEIGHT, x2: WIDTH, y2: 0, style: { stroke: "var(--ink)", strokeWidth: 0.06, strokeDasharray: "0.25 0.15" } }, g);
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
  await tween(1400, (p) => {
    state.t = from + (target - from) * p;
    draw();
  });
  state.t = target;
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

renderTable();
draw();
