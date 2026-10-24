import { mountPage } from "../../assets/js/page.js";
import { $, $$, bindRange, segmented } from "../../assets/js/lib/dom.js";
import { lineChart } from "../../assets/js/lib/chart.js";
import { fmt, length } from "../../assets/js/lib/format.js";
import { stageCanvas } from "../../assets/js/lib/fx.js";
import { uniformGap, peakLift, liftProfile } from "./model.js";
import { explainer } from "../../assets/js/lib/explainer.js";
import { scenes as explainerScenes } from "./explainer.js";

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

// ---------- Planet stage ----------

const BODIES = [
  { max: 3, name: "Ball", a: "#ffb066", b: "#c4511a", glow: "rgba(255,140,60,0.35)", kind: "ball" },
  { max: 5e5, name: "Asteroid", a: "#b9b2a6", b: "#4a4540", glow: "rgba(200,200,200,0.15)", kind: "rock" },
  { max: 3e6, name: "Moon", a: "#e4e4e8", b: "#5d5d66", glow: "rgba(220,220,255,0.2)", kind: "rock" },
  { max: 1.5e7, name: "Earth", a: "#5ab8ff", b: "#0b3a8c", glow: "rgba(80,160,255,0.45)", kind: "earth" },
  { max: 2e8, name: "Gas giant", a: "#f3d2a2", b: "#9a5a2c", glow: "rgba(255,200,140,0.3)", kind: "bands" },
  { max: Infinity, name: "Star", a: "#fff4c2", b: "#ff8a00", glow: "rgba(255,170,40,0.75)", kind: "star" },
];
const bodyFor = (R) => {
  const preset = [...$$("[data-presets] button")].find((b) => Math.abs(Number(b.dataset.radius) - R) / R < 0.01);
  const body = BODIES.find((b) => R < b.max);
  return { ...body, name: preset?.textContent ?? body.name };
};

const stars = Array.from({ length: 160 }, () => [Math.random(), Math.random(), Math.random() * 1.3 + 0.2, Math.random() * 6]);
const crater = Array.from({ length: 14 }, () => [Math.random() * 2 - 1, Math.random() * 2 - 1, 0.05 + Math.random() * 0.14]);
const lands = Array.from({ length: 26 }, (_, i) => {
  const c = [0.6, 2.4, 4.2][i % 3];
  return [c + (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 1.3, 0.08 + Math.random() * 0.16];
});
const anim = { gap: { x: 14, v: 0 }, theta: { x: 0.5, v: 0 } };
let view = { gapRatio: 0.05, theta: 0.5 };

function spring(s, target) {
  s.v = (s.v + (target - s.x) * 0.09) * 0.78;
  s.x += s.v;
  return s.x;
}

const planet = stageCanvas($("#planet"), {
  aspect: 16 / 10,
  minHeight: 320,
  maxHeight: 560,
  animate: true,
  label: "A planet with a rope around it.",
  draw(ctx, w, h, t) {
    // stars
    for (const [x, y, r, ph] of stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * Math.sin(t * 1.5 + ph) ** 2})`;
      ctx.fillRect(x * w, y * h, r, r);
    }
    const body = bodyFor(state.R);
    const peak = state.mode === "peak";
    const RD = peak ? Math.min(w * 0.36, h * 0.62) : Math.min(w, h) * 0.3;
    const cx = w / 2;
    const cy = peak ? h * 0.42 + RD : h / 2 - 10;

    // atmosphere glow
    const glow = ctx.createRadialGradient(cx, cy, RD * 0.9, cx, cy, RD * (body.kind === "star" ? 1.9 : 1.35));
    glow.addColorStop(0, body.glow);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, RD * 2, 0, Math.PI * 2);
    ctx.fill();

    // sphere body
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, RD, 0, Math.PI * 2);
    ctx.clip();
    const shade = ctx.createRadialGradient(cx - RD * 0.4, cy - RD * 0.45, RD * 0.1, cx, cy, RD * 1.05);
    shade.addColorStop(0, body.a);
    shade.addColorStop(1, body.b);
    ctx.fillStyle = shade;
    ctx.fillRect(cx - RD, cy - RD, RD * 2, RD * 2);
    const spin = t * 0.15;
    if (body.kind === "earth") {
      ctx.fillStyle = "rgba(70,190,120,0.75)";
      for (const [lon, lat, s] of lands) {
        const x = Math.sin(lon + spin);
        if (Math.cos(lon + spin) < 0) continue;
        ctx.beginPath();
        ctx.ellipse(cx + x * RD * 0.85, cy + lat * RD * 0.6, RD * s * Math.sqrt(1 - x * x) + 1, RD * s * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        ctx.ellipse(cx + Math.sin(spin * 1.4 + k * 1.7) * RD * 0.6, cy - RD * 0.75 + k * RD * 0.3, RD * (0.25 + (k % 3) * 0.12), RD * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (body.kind === "rock") {
      for (const [x, y, r] of crater) {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.beginPath();
        ctx.arc(cx + x * RD * 0.8, cy + y * RD * 0.8, r * RD, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (body.kind === "bands") {
      for (let k = -5; k <= 5; k++) {
        ctx.fillStyle = k % 2 ? "rgba(140,70,30,0.28)" : "rgba(255,240,210,0.18)";
        ctx.fillRect(cx - RD, cy + k * RD * 0.18 + Math.sin(t + k) * 2, RD * 2, RD * 0.12);
      }
    } else if (body.kind === "ball") {
      ctx.strokeStyle = "rgba(60,20,0,0.6)";
      ctx.lineWidth = Math.max(1.5, RD * 0.02);
      ctx.beginPath();
      ctx.ellipse(cx, cy, RD * Math.abs(Math.cos(spin * 3)), RD, 0, 0, Math.PI * 2);
      ctx.moveTo(cx - RD, cy);
      ctx.lineTo(cx + RD, cy);
      ctx.stroke();
    } else if (body.kind === "star") {
      for (let k = 0; k < 40; k++) {
        const a = k * 2.4 + t * 0.2;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * RD * ((k % 7) / 7), cy + Math.sin(a * 1.3) * RD * ((k % 5) / 5), RD * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // terminator shadow
    const dark = ctx.createLinearGradient(cx - RD, cy - RD, cx + RD, cy + RD);
    dark.addColorStop(0.45, "rgba(0,0,0,0)");
    dark.addColorStop(1, body.kind === "star" ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.55)");
    ctx.fillStyle = dark;
    ctx.fillRect(cx - RD, cy - RD, RD * 2, RD * 2);
    ctx.restore();

    // the rope: glowing, with a flowing dash
    ctx.save();
    ctx.lineCap = ctx.lineJoin = "round";
    const ropePath = () => {
      ctx.beginPath();
      if (!peak) {
        const room = Math.min(w, h) / 2 - RD - 12;
        ctx.arc(cx, cy, RD + spring(anim.gap, Math.max(10, Math.min(room, view.gapRatio * RD))), 0, Math.PI * 2);
      } else {
        const th = spring(anim.theta, view.theta);
        const peakR = RD / Math.cos(th);
        const tx = RD * Math.sin(th);
        const ty = RD * Math.cos(th);
        ctx.moveTo(cx - tx, cy - ty);
        ctx.lineTo(cx, cy - peakR);
        ctx.lineTo(cx + tx, cy - ty);
        ctx.arc(cx, cy, RD + 1, -Math.PI / 2 + th, -Math.PI / 2 - th + Math.PI * 2);
      }
    };
    ctx.shadowColor = "rgba(255,170,90,0.9)";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = "#ffb15e";
    ctx.lineWidth = 3;
    ropePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([2, 14]);
    ctx.lineDashOffset = -t * 30;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ropePath();
    ctx.stroke();
    ctx.restore();

    // measurement callout
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 1.2;
    ctx.font = "700 14px -apple-system, Inter, sans-serif";
    if (!peak) {
      const g = anim.gap.x;
      ctx.beginPath();
      ctx.moveTo(cx, cy - RD);
      ctx.lineTo(cx, cy - RD - g);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - RD - g / 2);
      ctx.lineTo(cx + 46, cy - RD - g / 2 - 26);
      ctx.lineTo(cx + 96, cy - RD - g / 2 - 26);
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.fillText(length(uniformGap(state.extra)), cx + 100, cy - RD - g / 2 - 21);
    } else {
      const peakY = cy - RD / Math.cos(anim.theta.x);
      const pulse = 4 + Math.sin(t * 4) * 1.5;
      ctx.beginPath();
      ctx.arc(cx, peakY, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillText(`${length(peakLift(state.R, state.extra).height)} high`, cx, Math.max(18, peakY - 16));
    }
  },
});

function drawGlobe() {
  let exaggerated = false;
  if (state.mode === "even") {
    const ratio = uniformGap(state.extra) / state.R;
    // Below ~4% of the radius the gap would be invisible: draw it bigger (and say so).
    view.gapRatio = ratio < 0.04 ? 0.04 + Math.log10(1 + state.extra) * 0.06 : ratio;
    exaggerated = ratio < 0.04 ? "bigger" : ratio > 0.55 ? "smaller" : false;
  } else {
    let t = peakLift(state.R, state.extra).theta;
    if (t < (4 * Math.PI) / 180) {
      t = (12 + Math.log10(1 + state.extra) * 14) * (Math.PI / 180);
      exaggerated = true;
    }
    view.theta = Math.min(t, 1.1);
  }
  const body = bodyFor(state.R);
  $("#hud-body").textContent = body.name;
  if (state.mode === "even") {
    $("#hud-label").textContent = "Gap under the rope";
    $("#hud-value").textContent = length(uniformGap(state.extra));
  } else {
    $("#hud-label").textContent = "Peak height";
    $("#hud-value").textContent = length(peakLift(state.R, state.extra).height);
  }
  planet.setLabel(
    state.mode === "even"
      ? `${body.name} with rope floating evenly ${length(uniformGap(state.extra))} above it`
      : `${body.name} with rope pulled up to a single peak ${length(peakLift(state.R, state.extra).height)} high`,
  );
  $("#globe-caption").textContent =
    exaggerated === "smaller"
      ? "The gap is drawn shorter so it fits on screen; the numbers are exact."
      : exaggerated
        ? "The rope’s offset is exaggerated so you can see it; the numbers are exact."
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

explainer($("[data-explainer]"), { title: $("[data-explainer]").dataset.title, scenes: explainerScenes });
