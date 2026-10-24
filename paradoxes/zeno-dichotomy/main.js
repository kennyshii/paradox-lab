import { mountPage } from "../../assets/js/page.js";
import { $ } from "../../assets/js/lib/dom.js";
import { lineChart, svg } from "../../assets/js/lib/chart.js";
import { tween } from "../../assets/js/lib/sim.js";
import { fmt, pct, length } from "../../assets/js/lib/format.js";
import { stageCanvas } from "../../assets/js/lib/fx.js";
import { covered, remaining, harmonicPartial, checkpointsPassed, timeAt } from "./model.js";
import { explainer } from "../../assets/js/lib/explainer.js";
import { scenes as explainerScenes } from "./explainer.js";

mountPage();

const ROOM = 5; // metres
const TRIP = 10; // seconds at a steady walking pace
const MAX_STEPS = 50; // beyond ~53 halvings, doubles can't tell the runner from the wall

const state = { k: 0, x: 0, walking: false, arrived: false };
const position = () => (state.walking || state.arrived ? state.x : covered(state.k));
const LABELS = ["½", "¾", "⅞", "15⁄16"];

// ---------- Tracks (redrawn at real pixel width so text stays readable) ----------

function trackView(box, draw) {
  const root = svg("svg", { role: "img", height: 96 }, box);
  let width = box.clientWidth || 600;
  const redraw = () => {
    root.replaceChildren();
    root.setAttribute("width", width);
    root.setAttribute("viewBox", `0 0 ${width} 96`);
    draw(root, width);
  };
  new ResizeObserver(([e]) => {
    const w = Math.floor(e.contentRect.width);
    if (w > 0 && w !== width) {
      width = w;
      redraw();
    }
  }).observe(box);
  return redraw;
}

const text = (parent, x, y, t, extra = {}) => svg("text", { x, y, "text-anchor": "middle", text: t, style: { fill: "var(--muted)", fontSize: "12px", fontFamily: "var(--font-sans)", ...extra } }, parent);

function drawRoom(root, w) {
  const L = 18;
  const R = w - 30;
  const sx = (v) => L + v * (R - L);
  const pos = position();
  svg("line", { x1: L, x2: R, y1: 50, y2: 50, style: { stroke: "var(--line-strong)", strokeWidth: 3, strokeLinecap: "round" } }, root);
  svg("rect", { x: R, y: 20, width: 10, height: 50, rx: 2, style: { fill: "var(--falsidical)" } }, root);
  text(root, R + 5, 86, "door");
  text(root, L, 86, "start");
  const shown = Math.min(MAX_STEPS, Math.max(state.k, 6, state.walking ? 14 : 0));
  for (let j = 1; j <= shown; j++) {
    const x = sx(covered(j));
    const done = pos >= covered(j) - 1e-12;
    svg("line", { x1: x, x2: x, y1: 50 - 14 / Math.sqrt(j), y2: 50 + 14 / Math.sqrt(j), style: { stroke: done ? "var(--chart-1)" : "var(--line-strong)", strokeWidth: 2 } }, root);
    if (j <= LABELS.length && x - sx(covered(j - 1)) > 22) text(root, x, 86, LABELS[j - 1], { fill: done ? "var(--chart-1)" : "var(--muted)", fontWeight: 700 });
  }
  svg("line", { x1: L, x2: sx(pos), y1: 50, y2: 50, style: { stroke: "var(--chart-1)", strokeWidth: 5, strokeLinecap: "round" } }, root);
  svg("circle", { cx: sx(pos), cy: 50, r: 9, style: { fill: "var(--chart-2)", stroke: "var(--surface)", strokeWidth: 3 } }, root);
  root.setAttribute("aria-label", `Walker at ${pct(pos, pos > 0.999 && pos < 1 ? 4 : 1)} of the way across the room.`);
}

function drawZoom(root, w) {
  const L = 18;
  const R = w - 30;
  const pos = position();
  const kz = state.walking || state.arrived ? Math.min(MAX_STEPS, checkpointsPassed(pos)) : state.k;
  if (state.arrived) {
    text(root, w / 2, 54, "Arrived. There is no “last step” to zoom into.", { fontSize: "14px", fill: "var(--ink-2)" });
    root.setAttribute("aria-label", "Arrived at the door.");
    return;
  }
  const start = covered(kz);
  const span = remaining(kz);
  const sx = (v) => L + ((v - start) / span) * (R - L);
  svg("line", { x1: L, x2: R, y1: 50, y2: 50, style: { stroke: "var(--line-strong)", strokeWidth: 3, strokeLinecap: "round" } }, root);
  svg("rect", { x: R, y: 20, width: 10, height: 50, rx: 2, style: { fill: "var(--falsidical)" } }, root);
  for (let j = 1; j <= 6; j++) {
    const x = sx(covered(kz + j));
    svg("line", { x1: x, x2: x, y1: 50 - 14 / Math.sqrt(j), y2: 50 + 14 / Math.sqrt(j), style: { stroke: "var(--line-strong)", strokeWidth: 2 } }, root);
  }
  text(root, sx(covered(kz + 1)), 86, "next halfway mark", { fontWeight: 600 });
  svg("circle", { cx: sx(pos), cy: 50, r: 9, style: { fill: "var(--chart-2)", stroke: "var(--surface)", strokeWidth: 3 } }, root);
  text(root, L + 60, 20, `width shown: ${length(span * ROOM, 2)}`, { fill: "var(--ink-2)", fontWeight: 600 });
  root.setAttribute("aria-label", `Zoomed view of the remaining ${length(span * ROOM, 2)}.`);
}

const redrawRoom = trackView($("#track"), drawRoom);
const redrawZoom = trackView($("#zoom"), drawZoom);

// ---------- The tiling square ----------

const tiles = Array.from({ length: 40 }, () => ({ p: 0, v: 0 }));
const FRACS = ["½", "¼", "⅛", "1⁄16", "1⁄32"];

const tiling = stageCanvas($("#tiling"), {
  aspect: 16 / 9,
  minHeight: 300,
  maxHeight: 460,
  animate: true,
  label: "A square filled by halves: one half, a quarter, an eighth, and so on.",
  draw(ctx, w, h, t) {
    const pos = position();
    const shown = state.arrived ? 40 : state.walking ? Math.min(40, checkpointsPassed(pos)) : Math.min(40, state.k);
    const S = Math.min(h - 70, w * 0.6);
    let x = (w - S) / 2;
    let y = (h - 56 - S) / 2 + 6;
    let tw = S;
    let th = S;
    // empty square
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, S, S);
    for (let i = 0; i < 40; i++) {
      const tile = tiles[i];
      const target = i < shown ? 1 : 0;
      tile.v = (tile.v + (target - tile.p) * 0.14) * 0.72;
      tile.p += tile.v;
      // this tile's rectangle: alternately the left half / top half of what remains
      let rx;
      let ry;
      let rw;
      let rh;
      if (i % 2 === 0) {
        rw = tw / 2;
        rh = th;
        rx = x;
        ry = y;
        x += rw;
        tw = rw;
      } else {
        rw = tw;
        rh = th / 2;
        rx = x;
        ry = y + rh;
        th = rh;
      }
      if (tile.p < 0.01 || rw < 0.3) continue;
      const k = Math.max(0, Math.min(1.15, tile.p));
      const cxr = rx + rw / 2;
      const cyr = ry + rh / 2;
      const hue = 210 + i * 22;
      const newest = i === shown - 1 && !state.arrived;
      ctx.save();
      ctx.translate(cxr, cyr);
      ctx.scale(k, k);
      const g = ctx.createLinearGradient(-rw / 2, -rh / 2, rw / 2, rh / 2);
      g.addColorStop(0, `hsla(${hue}, 95%, 66%, 0.95)`);
      g.addColorStop(1, `hsla(${hue + 30}, 90%, 52%, 0.85)`);
      ctx.fillStyle = g;
      if (newest) {
        ctx.shadowColor = `hsla(${hue}, 100%, 65%, ${0.5 + 0.4 * Math.sin(t * 4) ** 2})`;
        ctx.shadowBlur = 30;
      }
      ctx.fillRect(-rw / 2 + 1, -rh / 2 + 1, rw - 2, rh - 2);
      ctx.restore();
      if (i < FRACS.length && rw > 34 && rh > 30) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.font = `700 ${Math.min(34, rw / 3)}px -apple-system, Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = Math.min(1, tile.p);
        ctx.fillText(FRACS[i], cxr, cyr);
        ctx.globalAlpha = 1;
      }
    }
    if (state.arrived) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.1 * Math.sin(t * 3)})`;
      ctx.fillRect((w - S) / 2, (h - 56 - S) / 2 + 6, S, S);
    }
  },
});

function renderTiling() {
  const pos = position();
  const steps = state.walking || state.arrived ? checkpointsPassed(pos) : state.k;
  $("#tile-sum").textContent = state.arrived ? "1" : steps === 0 ? "0" : steps <= 12 ? fmt(covered(steps), Math.min(8, steps)) : `0.${"9".repeat(Math.min(10, Math.floor(steps * 0.30103)))}…`;
  $("#tile-time").textContent = `${fmt(TRIP * pos, steps > 9 ? 4 : 2)} s`;
}

// ---------- Stats & chart ----------

function renderStats() {
  const pos = position();
  const steps = state.walking || state.arrived ? checkpointsPassed(pos) : state.k;
  const stepsText = steps === Infinity ? "∞" : fmt(steps);
  const left = Math.max(0, 1 - pos);
  $("#stats").innerHTML = `
    <div class="stat"><div class="stat-label">${state.walking || state.arrived ? "Checkpoints passed" : "Half-steps taken"}</div><div class="stat-value">${stepsText}</div></div>
    <div class="stat"><div class="stat-label">Distance covered</div><div class="stat-value">${pos >= 1 ? "100%" : pct(pos, steps > 9 ? 4 : 1)}</div><div class="stat-note">of a ${ROOM} m room</div></div>
    <div class="stat"><div class="stat-label">Still to go</div><div class="stat-value">${left === 0 ? "0" : length(left * ROOM, 2)}</div></div>
    <div class="stat"><div class="stat-label">Time elapsed</div><div class="stat-value">${fmt(TRIP * pos, steps > 9 ? 4 : 2)} s</div><div class="stat-note">at a steady pace, ${TRIP} s per crossing</div></div>`;
}

const chart = lineChart($("#chart"), {
  height: 260,
  x: { domain: [1, 10], label: "Number of terms", format: (v) => fmt(v) },
  y: { domain: [0, 1.2], label: "Running total", format: (v) => fmt(v, 1) },
  series: [
    { id: "zeno", label: "½ + ¼ + ⅛ + … (Zeno)", color: "var(--chart-1)", dots: true },
    { id: "harmonic", label: "1 + ½ + ⅓ + … (harmonic)", color: "var(--chart-2)", dots: true, r: 3 },
  ],
  ariaLabel: "Partial sums of Zeno's series approaching 1.",
});

function renderChart() {
  const K = Math.max(10, Math.min(MAX_STEPS, state.k));
  const showH = $("#harmonic").checked;
  const zeno = Array.from({ length: K }, (_, i) => [i + 1, covered(i + 1)]);
  const harmonic = showH ? Array.from({ length: K }, (_, i) => [i + 1, harmonicPartial(i + 1)]) : [];
  chart.setAxis("x", { domain: [1, K] });
  chart.setAxis("y", { domain: [0, showH ? Math.ceil(harmonicPartial(K) + 0.5) : 1.2] });
  chart.setLines({ h: [{ y: 1, label: "1 = the door" }] });
  chart.setMany({ zeno, harmonic });
  chart.setMarkers(state.k > 0 && state.k <= K ? [{ x: state.k, y: covered(state.k), color: "var(--chart-1)", label: `after ${state.k}: ${fmt(covered(state.k), 6)}` }] : []);
}

function render() {
  renderTiling();
  redrawRoom();
  redrawZoom();
  renderStats();
  renderChart();
  $("#step").disabled = state.walking || state.arrived || state.k >= MAX_STEPS;
}

// ---------- Controls ----------

let timer = null;
function stopAuto() {
  clearInterval(timer);
  timer = null;
  $("#play").textContent = "▶ Auto-step";
}

$("#step").addEventListener("click", () => {
  state.k = Math.min(MAX_STEPS, state.k + 1);
  render();
});

$("#play").addEventListener("click", () => {
  if (timer) return stopAuto();
  if (state.walking || state.arrived) return;
  $("#play").textContent = "⏸ Pause";
  timer = setInterval(() => {
    if (state.k >= 30) return stopAuto();
    state.k++;
    render();
  }, 450);
});

$("#walk").addEventListener("click", async () => {
  if (state.walking) return;
  stopAuto();
  state.walking = true;
  state.arrived = false;
  const from = covered(state.k);
  state.x = from;
  render();
  await tween((1 - from) * 6000, (t) => {
    state.x = from + (1 - from) * t;
    if (state.x >= 1) state.x = 1 - 1e-15;
    render();
  }, (t) => t);
  state.walking = false;
  state.arrived = true;
  state.x = 1;
  render();
});

$("#reset").addEventListener("click", () => {
  stopAuto();
  Object.assign(state, { k: 0, x: 0, walking: false, arrived: false });
  render();
});

$("#harmonic").addEventListener("change", renderChart);

render();

explainer($("[data-explainer]"), { title: $("[data-explainer]").dataset.title, scenes: explainerScenes });
