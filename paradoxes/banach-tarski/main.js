import { mountPage, renderMath } from "../../assets/js/page.js";
import { $, segmented } from "../../assets/js/lib/dom.js";
import { svg } from "../../assets/js/lib/chart.js";
import { reducedWords, pieceOf, inShiftedPiece } from "./model.js";

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

const DESCRIPTIONS = {
  pieces: {
    legend: ["a", "A", "b", "B"].map((l) => [COLOR[l], `${NAME[l]}: words starting with ${l === "A" ? "a⁻¹" : l === "B" ? "b⁻¹" : l}`]),
    text: "Every word except \\(e\\) starts with exactly one letter, so the group splits into four pieces by first letter. Each looks like a quarter of the tree.",
  },
  a: {
    legend: [
      [COLOR.a, "\\(a^{-1}W(a)\\): W(a) shifted one step"],
      [COLOR.A, "W(a⁻¹), unchanged"],
    ],
    text: "Shift \\(W(a)\\) by \\(a^{-1}\\): it now covers everything except the \\(a^{-1}\\) branch, about three quarters of the tree. Add \\(W(a^{-1})\\) back and you have the <strong>whole group</strong>, from just two of the four pieces.",
  },
  b: {
    legend: [
      [COLOR.b, "\\(b^{-1}W(b)\\): W(b) shifted one step"],
      [COLOR.B, "W(b⁻¹), unchanged"],
    ],
    text: "The other two pieces do the same with \\(b\\): \\(b^{-1}W(b) \\sqcup W(b^{-1})\\) is again the <strong>whole group</strong>. Four pieces, two complete copies.",
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
  svg("text", { x: 0.05, y: -0.05, text: "e", style: { fontSize: "0.09px", fontStyle: "italic", fill: "var(--ink)", fontFamily: "var(--font-serif)" } }, tree);

  const d = DESCRIPTIONS[mode];
  $("#legend").innerHTML = d.legend.map(([c, label]) => `<li><span class="swatch is-dot" style="--swatch:${c}"></span>${label}</li>`).join("");
  $("#tree-desc").innerHTML = `<p>${d.text}</p>`;
  tree.setAttribute("aria-label", `Tree of the free group F2 to depth ${DEPTH}, coloured to show: ${mode === "pieces" ? "the four pieces" : `the shifted piece ${mode}`}.`);
  renderMath($("#legend"));
  renderMath($("#tree-desc"));
}

segmented($("[data-mode]"), { onChange: draw });
draw("pieces");
