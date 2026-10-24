import { mountPage } from "../../assets/js/page.js";
import { $, h, bindRange } from "../../assets/js/lib/dom.js";
import { svg } from "../../assets/js/lib/chart.js";
import { split, proofSteps, stepHolds } from "./model.js";

mountPage();

const ALPHA = "var(--chart-3)";
const BETA = "var(--chart-2)";
const UNKNOWN = "var(--surface-2)";
const REAL = ["#8b4a2b", "#f3efe6"]; // chestnut and grey-white: two real horses

let m = 4;
let step = 0;

// ---------- Horse glyph ----------

function horse(parent, x, y, fill, { dim = false, ring = false } = {}) {
  const g = svg("g", { transform: `translate(${x} ${y})`, style: { opacity: dim ? 0.3 : 1 } }, parent);
  const st = { fill, stroke: "var(--ink)", strokeWidth: 1.4, strokeLinejoin: "round" };
  if (ring) svg("ellipse", { cx: 30, cy: 30, rx: 31, ry: 29, style: { fill: "none", stroke: "var(--accent)", strokeWidth: 2.5, strokeDasharray: "4 3" } }, g);
  svg("path", { d: "M13 24 Q3 28 7 42", style: { fill: "none", stroke: "var(--ink)", strokeWidth: 3, strokeLinecap: "round" } }, g);
  for (const lx of [16, 22, 36, 42]) svg("rect", { x: lx, y: 30, width: 4, height: 18, rx: 1.5, style: st }, g);
  svg("ellipse", { cx: 29, cy: 27, rx: 17, ry: 9, style: st }, g);
  svg("path", { d: "M38 26 L44 9 L47 4 L49 9 L57 14 L55 19 L48 17 L46 29 Z", style: st }, g);
  svg("circle", { cx: 50, cy: 12, r: 1.3, style: { fill: "var(--ink)" } }, g);
  return g;
}

function bracket(parent, x1, x2, y, label, color, up) {
  const d = up ? `M${x1} ${y + 8} V${y} H${x2} V${y + 8}` : `M${x1} ${y - 8} V${y} H${x2} V${y - 8}`;
  svg("path", { d, style: { fill: "none", stroke: color, strokeWidth: 2.5 } }, parent);
  svg("text", { x: (x1 + x2) / 2, y: up ? y - 6 : y + 18, "text-anchor": "middle", text: label, style: { fill: color, fontWeight: 700, fontSize: "14px" } }, parent);
}

// ---------- Drawing ----------

const SLOT = 66;
const board = $("#herd");

function colourFor(i, id, overlap, ok) {
  // i is 1-based horse number
  const inA = i >= 2;
  const inB = i <= m - 1;
  switch (id) {
    case "claim":
    case "hyp":
    case "herd":
      return UNKNOWN;
    case "base":
      return i === 1 ? ALPHA : UNKNOWN;
    case "A":
      return inA ? ALPHA : UNKNOWN;
    case "B":
      if (inA && inB) return "url(#ab)";
      return inA ? ALPHA : BETA;
    case "link":
      if (ok) return ALPHA;
      return inA ? ALPHA : BETA;
    case "done":
      return ok ? ALPHA : REAL[(i - 1) % 2];
  }
  return UNKNOWN;
}

function draw() {
  const steps = proofSteps(m);
  const { id, ok } = steps[step];
  const { overlap } = split(m);
  // Keep a fixed minimum width so small herds aren't blown up to fill the frame.
  const width = Math.max(m, 5) * SLOT + 24;
  const offset = ((Math.max(m, 5) - m) * SLOT) / 2;
  board.setAttribute("viewBox", `0 0 ${width} 170`);
  board.replaceChildren();

  const defs = svg("defs", {}, board);
  const grad = svg("linearGradient", { id: "ab", x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
  for (const [off, c] of [[0, BETA], [0.5, BETA], [0.5, ALPHA], [1, ALPHA]]) svg("stop", { offset: off, style: { stopColor: c } }, grad);

  const xOf = (i) => 12 + offset + (i - 1) * SLOT;
  for (let i = 1; i <= m; i++) {
    const dim = id === "base" && i !== 1;
    const ring = (id === "link" || id === "B") && overlap.includes(i);
    horse(board, xOf(i) + 3, 46, colourFor(i, id, overlap, ok), { dim, ring });
    svg("text", { x: xOf(i) + 33, y: 112, "text-anchor": "middle", text: String(i), style: { fill: "var(--ink-2)", fontWeight: 700, fontSize: "14px" } }, board);
  }

  if (["A", "B", "link"].includes(id) && m >= 2) bracket(board, xOf(2) + 4, xOf(m) + 60, 30, "A: one colour α", ALPHA, true);
  if (["B", "link"].includes(id)) bracket(board, xOf(1) + 4, xOf(m - 1) + 60, 132, "B: one colour β", BETA, false);
  if (id === "link" && !ok) {
    svg("text", { x: xOf(1) + 66, y: 82, "text-anchor": "middle", text: "≠ ?", style: { fill: "var(--bad)", fontWeight: 800, fontSize: "20px" } }, board);
  }

  const captions = {
    claim: "Horses whose colours we don’t know yet.",
    base: "Base case: a single horse has one colour.",
    hyp: `Assume any ${m - 1} horses are one colour.`,
    herd: `A herd of ${m} horses.`,
    A: `Group A (horses 2–${m}) is one colour, α.`,
    B: overlap.length ? `Group B (horses 1–${m - 1}) is one colour, β. Horses ${overlap.join(", ")} are in both groups.` : "Group B is just horse 1, colour β. No horse is in both groups.",
    link: ok ? "The shared horses force α = β." : "No shared horse: α and β can differ.",
    done: ok ? `All ${m} horses are colour α (given the hypothesis).` : "The conclusion fails: two horses can be different colours.",
  };
  $("#herd-desc").textContent = captions[id];
  board.setAttribute("aria-label", captions[id]);
}

// ---------- Steps list & dominoes ----------

function renderSteps() {
  const steps = proofSteps(m);
  $("#steps").replaceChildren(
    ...steps.map((s, i) =>
      h(
        "li",
        { class: `proof-step${i === step ? " is-current" : ""}${i <= step && !s.ok ? " is-broken" : ""}${i < step && s.ok ? " is-done" : ""}` },
        h(
          "button",
          { type: "button", "aria-current": i === step ? "step" : null, on: { click: () => go(i) } },
          h("span", { class: "step-title" }, `${s.title}${i <= step && !s.ok ? " ✗" : ""}`),
          h("span", { class: "step-text" }, i <= step ? s.text : "…"),
        ),
      ),
    ),
  );
  $("#prev").disabled = step === 0;
  $("#next").disabled = step === steps.length - 1;
}

function renderDominoes() {
  const box = $("#dominoes");
  const items = [h("button", { type: "button", class: "domino is-ok", on: { click: () => setM(2, 1) }, "aria-label": "P(1), the base case: holds" }, "P(1) ✓")];
  for (let k = 2; k <= 7; k++) {
    const holds = stepHolds(k);
    items.push(
      h(
        "button",
        {
          type: "button",
          class: `domino ${holds ? "is-ok" : "is-broken"}${k === m ? " is-current" : ""}`,
          "aria-pressed": String(k === m),
          "aria-label": `Step from ${k - 1} to ${k} horses: ${holds ? "holds" : "fails"}`,
          on: { click: () => setM(k, 6) },
        },
        `${k - 1}→${k} ${holds ? "✓" : "✗"}`,
      ),
    );
  }
  box.replaceChildren(...items);
}

function go(i) {
  step = Math.max(0, Math.min(proofSteps(m).length - 1, i));
  renderSteps();
  draw();
}

const mInput = $("#m");
function setM(value, toStep) {
  mInput.value = value;
  syncM();
  if (toStep != null) go(toStep);
}

const syncM = bindRange(mInput, {
  output: $("#m-out"),
  format: (v) => `${v} horses${v === 2 ? " (n = 1)" : ""}`,
  onInput(v) {
    m = v;
    renderDominoes();
    renderSteps();
    draw();
  },
});

$("#prev").addEventListener("click", () => go(step - 1));
$("#next").addEventListener("click", () => go(step + 1));
