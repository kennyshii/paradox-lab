import { mountPage } from "../../assets/js/page.js";
import { $, $$, bindRange, segmented } from "../../assets/js/lib/dom.js";
import { lineChart, svg } from "../../assets/js/lib/chart.js";
import { fmt, length } from "../../assets/js/lib/format.js";
import { uniformGap, peakLift, liftProfile } from "./model.js";

mountPage();

const state = { mode: "even", R: 6371000, extra: 1 };

const radiusInput = $("#radius");
const extraInput = $("#extra");

const COMPARISONS = [
  [828, "the Burj Khalifa"],
  [330, "the Eiffel Tower"],
  [93, "the Statue of Liberty"],
  [46, "the Leaning Tower of Pisa"],
  [10, "a three-storey house"],
  [1.8, "a tall person"],
  [0.3, "a cat"],
];
const tallerThan = (h) => COMPARISONS.find(([v]) => h >= v)?.[1];

// ---------- Globe drawing (schematic) ----------

const globe = $("#globe");
const C = 150;
const RD = 108; // radius of the drawn sphere, in SVG units

function drawGlobe() {
  for (const el of [...globe.children]) if (el.tagName !== "title") el.remove();
  svg("circle", { cx: C, cy: C, r: RD, style: { fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 2 } }, globe);
  // a couple of latitude lines for a "planet" feel
  for (const k of [0.45, 0.8]) svg("ellipse", { cx: C, cy: C, rx: RD, ry: RD * k * 0.35, style: { fill: "none", stroke: "var(--accent)", strokeOpacity: 0.25 } }, globe);

  let exaggerated = false;
  if (state.mode === "even") {
    const gap = uniformGap(state.extra);
    let gapPx = (gap / state.R) * RD;
    if (gapPx < 10) {
      gapPx = 10;
      exaggerated = true;
    }
    gapPx = Math.min(gapPx, 34);
    svg("circle", { cx: C, cy: C, r: RD + gapPx, style: { fill: "none", stroke: "var(--chart-2)", strokeWidth: 3 } }, globe);
    svg("line", { x1: C, x2: C, y1: C - RD, y2: C - RD - gapPx, style: { stroke: "var(--ink)", strokeWidth: 1.5 } }, globe);
    svg("text", { x: C + 8, y: C - RD - gapPx / 2 + 4, text: length(gap), style: { fill: "var(--ink)", fontSize: "13px", fontWeight: 700 } }, globe);
  } else {
    const { theta } = peakLift(state.R, state.extra);
    let t = theta;
    if (t < (4 * Math.PI) / 180) {
      t = (30 * Math.PI) / 180;
      exaggerated = true;
    }
    const peakR = RD / Math.cos(t);
    const peakY = Math.max(C - peakR, 6);
    const tx = RD * Math.sin(t);
    const ty = RD * Math.cos(t);
    // rope: tangent, peak, tangent, then the rest of the circle on the ground
    const d = `M ${C - tx} ${C - ty} L ${C} ${peakY} L ${C + tx} ${C - ty} A ${RD} ${RD} 0 1 1 ${C - tx} ${C - ty}`;
    svg("path", { d, style: { fill: "none", stroke: "var(--chart-2)", strokeWidth: 3, strokeLinejoin: "round" } }, globe);
    svg("circle", { cx: C, cy: peakY, r: 4, style: { fill: "var(--chart-2)" } }, globe);
  }
  $("#globe-title").textContent =
    state.mode === "even"
      ? `Sphere with rope floating evenly ${length(uniformGap(state.extra))} above it`
      : `Sphere with rope pulled up to a single peak`;
  $("#globe-caption").textContent = exaggerated
    ? "Schematic. The rope’s offset is exaggerated so you can see it; the numbers are exact."
    : "Drawn to scale.";
}

// ---------- Stats ----------

function stat(label, value, note = "", hero = false) {
  return `<div class="stat${hero ? " is-hero" : ""}"><div class="stat-label">${label}</div><div class="stat-value">${value}</div>${note ? `<div class="stat-note">${note}</div>` : ""}</div>`;
}

function renderStats() {
  const circ = 2 * Math.PI * state.R;
  if (state.mode === "even") {
    const gap = uniformGap(state.extra);
    $("#stats").innerHTML =
      stat("Gap under the rope", length(gap), "= extra rope ÷ 2π", true) +
      stat("Original rope", length(circ)) +
      stat("Extra as share of rope", `${fmt((state.extra / circ) * 100, state.extra / circ < 1e-4 ? 8 : 3)}%`, "tiny, yet the gap isn’t");
  } else {
    const { height, groundSpan } = peakLift(state.R, state.extra);
    const comp = tallerThan(height);
    $("#stats").innerHTML =
      stat("Peak height", length(height), comp ? `taller than ${comp}` : "", true) +
      stat("Rope leaves the ground", `${length(groundSpan)}`, "either side of the peak") +
      stat("Evenly lifted, for comparison", length(uniformGap(state.extra)));
  }
}

// ---------- Chart ----------

const chartBox = $("#chart");
let chart;

function buildChart() {
  chartBox.replaceChildren();
  if (state.mode === "even") {
    chart = lineChart(chartBox, {
      height: 260,
      x: { type: "log", domain: [0.01, 1e9], label: "Sphere radius (log scale)", format: (v) => length(v, 0) },
      y: { domain: [0, 40], label: "Gap (cm)", format: (v) => fmt(v) },
      series: [{ id: "gap", label: "Gap for this much extra rope", color: "var(--chart-2)" }],
      ariaLabel: "Gap versus sphere radius: a flat line.",
    });
  } else {
    chart = lineChart(chartBox, {
      height: 260,
      x: { domain: [-1, 1], label: "", format: String },
      y: { domain: [0, 1], label: "", format: String },
      series: [
        { id: "ground", label: "Ground", color: "var(--accent)", width: 2 },
        { id: "rope", label: "Rope", color: "var(--chart-2)", fill: true },
      ],
      ariaLabel: "Side view of the lifted rope.",
    });
  }
}

function renderChart() {
  if (state.mode === "even") {
    const gapCm = uniformGap(state.extra) * 100;
    chart.setAxis("y", { domain: [0, Math.max(10, Math.ceil((gapCm * 1.6) / 10) * 10)] });
    chart.set("gap", [
      [0.01, gapCm],
      [1e9, gapCm],
    ]);
    chart.setMarkers([{ x: Math.min(Math.max(state.R, 0.01), 1e9), y: gapCm, color: "var(--chart-2)", label: `${length(state.R, 0)} → ${fmt(gapCm, 1)} cm` }]);
    $("#chart-title").textContent = "The gap doesn’t depend on the radius";
    $("#chart-caption").textContent = "From a ping-pong ball to a star, the line stays flat. Only the extra rope changes the gap.";
  } else {
    const { theta, height } = peakLift(state.R, state.extra);
    const prof = liftProfile(state.R, theta);
    const span = prof.at(-1)[0];
    const xKm = span >= 2000;
    const yCm = height < 1;
    const xs = xKm ? 1e-3 : 1;
    const ys = yCm ? 100 : 1;
    const pts = prof.map(([d, v]) => [d * xs, v * ys]);
    chart.setAxis("x", { domain: [pts[0][0], pts.at(-1)[0]], label: `Distance along the ground (${xKm ? "km" : "m"})`, format: (v) => fmt(v, Math.abs(span * xs) < 5 ? 1 : 0) });
    chart.setAxis("y", { domain: [0, height * ys * 1.18], label: `Height (${yCm ? "cm" : "m"})`, format: (v) => fmt(v, height * ys < 5 ? 1 : 0) });
    chart.setMany({
      ground: [
        [pts[0][0], 0],
        [pts.at(-1)[0], 0],
      ],
      rope: pts,
    });
    chart.setMarkers([{ x: 0, y: height * ys, color: "var(--chart-2)", label: `peak ${length(height)}` }]);
    chart.setAriaLabel(`Side view: the rope rises to ${length(height)} over ${length(span * 2)} of ground.`);
    $("#chart-title").textContent = "Side view of the lifted rope";
    $("#chart-caption").textContent = "Height is measured straight up from the curved ground. Horizontal and vertical scales differ.";
  }
}

// ---------- Wiring ----------

function render() {
  drawGlobe();
  renderStats();
  renderChart();
  for (const b of $$("[data-presets] button")) b.setAttribute("aria-pressed", String(Math.abs(Number(b.dataset.radius) - state.R) / state.R < 0.01));
}

const syncRadius = bindRange(radiusInput, {
  output: $("#radius-out"),
  format: (v) => length(10 ** v, 1),
  onInput(v) {
    state.R = 10 ** v;
    if (chart) render();
  },
});

bindRange(extraInput, {
  output: $("#extra-out"),
  format: (v) => length(v, 2),
  onInput(v) {
    state.extra = v;
    if (chart) render();
  },
});

for (const b of $$("[data-presets] button")) {
  b.addEventListener("click", () => {
    radiusInput.value = Math.log10(Number(b.dataset.radius));
    syncRadius();
  });
}

segmented($("[data-mode]"), {
  onChange(mode) {
    state.mode = mode;
    buildChart();
    render();
  },
});

state.R = 10 ** Number(radiusInput.value);
buildChart();
render();
