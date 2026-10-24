import { mountPage, renderMath } from "../../assets/js/page.js";
import { $, segmented } from "../../assets/js/lib/dom.js";
import { stageCanvas } from "../../assets/js/lib/fx.js";
import { prefersReducedMotion } from "../../assets/js/lib/sim.js";
import { svg } from "../../assets/js/lib/chart.js";
import { reducedWords, pieceOf, inShiftedPiece } from "./model.js";
import { explainer } from "../../assets/js/lib/explainer.js";
import { scenes as explainerScenes } from "./explainer.js";

mountPage();

const DEPTH = 5;
const DIR = { a: [1, 0], A: [-1, 0], b: [0, -1], B: [0, 1] };
const COLOR = { a: "var(--chart-1)", A: "var(--chart-2)", b: "var(--chart-3)", B: "var(--chart-4)", "": "var(--ink)" };
const NAME = { a: "W(a)", A: "W(a⁻¹)", b: "W(b)", B: "W(b⁻¹)" };

// Layout: each letter steps in its direction, half as far as the previous step.
const nodes = reducedWords(DEPTH).map((word) => {
  let x = 0;
  let y = 0;
  let len = 0.5;
  const path = [[0, 0]];
  for (const l of word) {
    x += DIR[l][0] * len;
    y += DIR[l][1] * len;
    path.push([x, y]);
    len /= 2;
  }
  return { word, x, y, parent: path.at(-2) ?? null, depth: word.length };
});

const tree = $("#tree");

function colourFor(word, mode) {
  if (mode === "pieces") return COLOR[pieceOf(word)];
  if (mode === "a") return inShiftedPiece("a", word) ? COLOR.a : COLOR.A;
  if (inShiftedPiece("b", word)) return COLOR.b;
  return COLOR.B;
}

const STEP = { a: "right", A: "left", b: "up", B: "down" };

const DESCRIPTIONS = {
  pieces: {
    legend: ["a", "A", "b", "B"].map((l) => [COLOR[l], `Routes whose first step is ${STEP[l]}`]),
    text: "Every route except the centre starts with exactly one first step, so the tree splits into four pieces. Each one looks like a quarter of the tree.",
  },
  a: {
    legend: [
      [COLOR.a, "The “right” piece, shifted back one step"],
      [COLOR.A, "The “left” piece, unchanged"],
    ],
    text: "Shift the “right” piece back one step towards the centre: it now covers everything except the “left” branch, about three quarters of the tree. Add the “left” piece back and you have the <strong>whole tree</strong>, from just two of the four pieces.",
  },
  b: {
    legend: [
      [COLOR.b, "The “up” piece, shifted back one step"],
      [COLOR.B, "The “down” piece, unchanged"],
    ],
    text: "The other two pieces do the same with up and down: again the <strong>whole tree</strong>. Four pieces, two complete copies.",
  },
};

function draw(mode) {
  tree.replaceChildren();
  const edges = svg("g", {}, tree);
  for (const n of nodes) {
    if (!n.parent) continue;
    svg("line", { x1: n.parent[0], y1: n.parent[1], x2: n.x, y2: n.y, style: { stroke: colourFor(n.word, mode), strokeWidth: 0.022 / (1 + n.depth * 0.35), strokeLinecap: "round" } }, edges);
  }
  for (const n of nodes) {
    svg("circle", { cx: n.x, cy: n.y, r: n.depth ? 0.034 / (1 + n.depth * 0.6) : 0.045, style: { fill: colourFor(n.word, mode) } }, tree);
  }
  svg("text", { x: 0.05, y: -0.05, text: "start", style: { fontSize: "0.09px", fontStyle: "italic", fill: "var(--ink)", fontFamily: "var(--font-serif)" } }, tree);

  const d = DESCRIPTIONS[mode];
  $("#legend").innerHTML = d.legend.map(([c, label]) => `<li><span class="swatch is-dot" style="--swatch:${c}"></span>${label}</li>`).join("");
  $("#tree-desc").innerHTML = `<p>${d.text}</p>`;
  tree.setAttribute("aria-label", `A tree of routes, ${DEPTH} steps deep, coloured to show ${mode === "pieces" ? "the four pieces" : mode === "a" ? "the right and left pieces forming a whole copy" : "the up and down pieces forming a whole copy"}.`);
  renderMath($("#legend"));
  renderMath($("#tree-desc"));
}

segmented($("[data-mode]"), { onChange: draw });

// ---------- Artist's impression: one ball, five pieces, two balls ----------

const fib = (n) =>
  Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.399963;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  });

const N = 1500;
const PIECE_COLORS = ["#2997ff", "#32d583", "#ff8a4c", "#c084fc", "#ff4fa3"];
const base = fib(N);
// Scatter points into five pieces like dust: neighbours usually land in different pieces.
const hash = (i) => {
  const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
};
const piece = base.map((_, i) => Math.floor(hash(i) * 5));
const groupOf = (k) => (k < 2 ? 0 : 1);
const counts = [0, 0];
const slot = piece.map((k) => counts[groupOf(k)]++);
const sphereA = fib(counts[0]);
const sphereB = fib(counts[1]);
const pts = base.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));

const PHASES = [
  ["One solid ball", "Made of infinitely many points."],
  ["Five scattered pieces", "Each piece is a dust of points, with no definite volume."],
  ["Two identical balls", "Rotate and slide the pieces: two full balls, each as big as the first."],
];
let phase = 0;
let auto = !prefersReducedMotion();
let phaseTimer;

const spheres = stageCanvas($("#spheres"), {
  aspect: 16 / 9,
  minHeight: 300,
  maxHeight: 480,
  animate: true,
  label: "A ball of points splitting into five pieces and reassembling into two balls.",
  draw(ctx, w, h, t) {
    const R = Math.min(h * 0.3, w * 0.17);
    const cy = h * 0.46;
    const spin = t * 0.35;
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    const drawn = [];
    for (let i = 0; i < N; i++) {
      const k = piece[i];
      let v;
      let cx;
      let rr = R;
      if (phase === 0) {
        v = base[i];
        cx = w / 2;
      } else if (phase === 1) {
        v = base[i];
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        cx = w / 2 + Math.cos(a) * R * 1.7;
        rr = R * 0.62;
        const tx = cx + v[0] * cs * rr + v[2] * sn * rr;
        const ty = cy + Math.sin(a) * R * 0.55 + v[1] * rr;
        drawn.push(project(i, tx, ty, -v[0] * sn + v[2] * cs, k));
        continue;
      } else {
        const g = groupOf(k);
        v = (g ? sphereB : sphereA)[slot[i]];
        cx = w / 2 + (g ? 1 : -1) * R * 1.45;
      }
      const tx = cx + (v[0] * cs + v[2] * sn) * rr;
      const ty = cy + v[1] * rr;
      drawn.push(project(i, tx, ty, -v[0] * sn + v[2] * cs, k));
    }
    // back-to-front so near points sit on top
    drawn.sort((a, b) => a.z - b.z);
    ctx.globalCompositeOperation = "lighter";
    for (const d of drawn) {
      ctx.globalAlpha = 0.35 + 0.65 * ((d.z + 1) / 2);
      ctx.fillStyle = phase === 0 ? "#cfe3ff" : PIECE_COLORS[d.k];
      const s = 1.2 + ((d.z + 1) / 2) * 1.8;
      ctx.fillRect(d.x - s / 2, d.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    function project(i, tx, ty, z, k) {
      const p = pts[i];
      if (!p.init) Object.assign(p, { x: tx, y: ty, init: true });
      p.vx = (p.vx + (tx - p.x) * (0.03 + (i % 7) * 0.004)) * 0.84;
      p.vy = (p.vy + (ty - p.y) * (0.03 + (i % 7) * 0.004)) * 0.84;
      p.x += p.vx;
      p.y += p.vy;
      return { x: p.x, y: p.y, z, k };
    }
  },
});

const phaseControl = segmented($("[data-phase]"), {
  onChange(v) {
    auto = false;
    setPhase(Number(v));
  },
});

function setPhase(k) {
  phase = k;
  phaseControl.set(String(k), { silent: true });
  $("#phase-title").textContent = PHASES[k][0];
  $("#phase-text").textContent = PHASES[k][1];
  spheres.setLabel(`${PHASES[k][0]}. ${PHASES[k][1]}`);
  clearTimeout(phaseTimer);
  if (auto) phaseTimer = setTimeout(() => setPhase((phase + 1) % 3), phase === 2 ? 4200 : 3000);
}
setPhase(0);
draw("pieces");

explainer($("[data-explainer]"), { title: $("[data-explainer]").dataset.title, scenes: explainerScenes });
