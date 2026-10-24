import { mountPage, renderMath } from "../../assets/js/page.js";
import { $, $$, h, segmented } from "../../assets/js/lib/dom.js";
import { barberShaves, testBarber, russellRow, testRussell } from "./model.js";
import { stageCanvas } from "../../assets/js/lib/fx.js";
import { prefersReducedMotion } from "../../assets/js/lib/sim.js";

mountPage();

segmented($("[data-tab]"), {
  onChange(v) {
    $("#panel-barber").hidden = v !== "barber";
    $("#panel-sets").hidden = v !== "sets";
  },
});

// ---------- The barber ----------

const villagers = [
  { name: "Alf", shavesSelf: true },
  { name: "Bert", shavesSelf: false },
  { name: "Carl", shavesSelf: true },
  { name: "Dan", shavesSelf: false },
];
let supposition = null;

// ---------- The barber's endless loop ----------

// A comet runs around a figure-eight: the left lobe is "he shaves himself", the right "he doesn't".
// Each lobe forces you into the other one, forever.
let loopU = 0;
let loopSide = null;
const LOOP_TEXT = {
  left: ["Suppose he shaves himself…", "then he’s a man who shaves himself, so the rule says the barber must not."],
  right: ["Suppose he doesn’t shave himself…", "then he’s a man who doesn’t, so the rule says the barber must shave him."],
};

const loop = stageCanvas($("#loop"), {
  aspect: 16 / 7,
  minHeight: 240,
  maxHeight: 360,
  animate: true,
  label: "A figure-eight loop: each supposition about the barber forces the opposite one.",
  draw(ctx, w, h, t) {
    const cx = w / 2;
    const cy = h * 0.42;
    const A = Math.min(w * 0.36, h * 0.9);
    const pt = (u) => {
      // lemniscate of Gerono-like curve, parameter u in [0, 1)
      const a = u * Math.PI * 2;
      return [cx + A * Math.sin(a), cy + A * 0.42 * Math.sin(a) * Math.cos(a)];
    };
    if (!prefersReducedMotion()) loopU = (loopU + 0.0026) % 1;
    // track
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    for (let k = 0; k <= 200; k++) {
      const [x, y] = pt(k / 200);
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    // lobe labels
    ctx.font = "700 14px -apple-system, Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(50,213,131,0.9)";
    ctx.fillText("shaves himself", cx + A * 0.62, cy + 5);
    ctx.fillStyle = "rgba(255,107,120,0.9)";
    ctx.fillText("doesn’t shave himself", cx - A * 0.62, cy + 5);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "600 11px -apple-system, Inter, sans-serif";
    ctx.fillText("the rule", cx, cy - 14);
    // comet with a fading tail
    ctx.globalCompositeOperation = "lighter";
    for (let k = 40; k >= 0; k--) {
      const u = (loopU - k * 0.004 + 1) % 1;
      const [x, y] = pt(u);
      const right = Math.sin(u * Math.PI * 2) > 0;
      ctx.fillStyle = right ? `rgba(50,213,131,${(1 - k / 40) * 0.5})` : `rgba(255,107,120,${(1 - k / 40) * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, 7 * (1 - k / 45), 0, Math.PI * 2);
      ctx.fill();
    }
    const [hx, hy] = pt(loopU);
    const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 26);
    glow.addColorStop(0, "rgba(255,255,255,0.95)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(hx, hy, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    const side = Math.sin(loopU * Math.PI * 2) > 0 ? "left" : "right";
    if (side !== loopSide) {
      loopSide = side;
      $("#loop-title").textContent = LOOP_TEXT[side][0];
      $("#loop-text").textContent = LOOP_TEXT[side][1];
    }
  },
});

const yesNo = (v) => h("span", { class: `pill ${v ? "is-yes" : "is-no"}` }, v ? "Yes" : "No");

function renderVillage() {
  const rows = villagers.map((v) =>
    h(
      "tr",
      {},
      h("th", { scope: "row" }, v.name),
      h(
        "td",
        {},
        h(
          "button",
          {
            type: "button",
            class: "toggle",
            "aria-pressed": String(v.shavesSelf),
            "aria-label": `${v.name} shaves himself: ${v.shavesSelf ? "yes" : "no"}. Press to change.`,
            on: {
              click: () => {
                v.shavesSelf = !v.shavesSelf;
                renderVillage();
              },
            },
          },
          v.shavesSelf ? "Yes" : "No",
        ),
      ),
      h("td", {}, yesNo(barberShaves(v.shavesSelf)), h("span", { class: "why-cell" }, v.shavesSelf ? " shaves himself, so not the barber’s job" : " doesn’t shave himself, so the barber must")),
    ),
  );

  let barberCells;
  if (supposition == null) {
    barberCells = [h("td", {}, h("span", { class: "pill is-unknown" }, "?")), h("td", {}, h("span", { class: "pill is-unknown" }, "?"))];
  } else {
    const t = testBarber(supposition);
    barberCells = [h("td", {}, yesNo(t.assumed)), h("td", { class: "is-clash" }, yesNo(t.ruleSays), h("span", { class: "why-cell" }, " ✗ contradicts the left column"))];
  }
  rows.push(h("tr", { class: "barber-row" }, h("th", { scope: "row" }, "The barber"), ...barberCells));

  $("#village").replaceChildren(
    h("caption", { class: "visually-hidden" }, "Who shaves whom in the village"),
    h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Villager"), h("th", { scope: "col" }, "Shaves himself?"), h("th", { scope: "col" }, "Shaved by the barber?"))),
    h("tbody", {}, ...rows),
  );
}

$$("[data-suppose]").forEach((b) =>
  b.addEventListener("click", () => {
    supposition = b.dataset.suppose === "true";
    loopU = supposition ? 0.02 : 0.52;
    $$("[data-suppose]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderVillage();
    const t = testBarber(supposition);
    $("#barber-result").className = "callout is-bad";
    $("#barber-result").innerHTML = t.assumed
      ? "<p><strong>Contradiction.</strong> If the barber shaves himself, he is a man who shaves himself, and the barber never shaves those. So he doesn’t shave himself.</p><p>Try the other supposition…</p>"
      : "<p><strong>Contradiction.</strong> If the barber doesn’t shave himself, he is a man who doesn’t shave himself, and the barber shaves all of those. So he does shave himself.</p><p>Both options fail: <strong>no such barber can exist</strong>.</p>";
  }),
);

// ---------- Russell's sets ----------

const NAMES = ["S₁", "S₂", "S₃", "S₄", "S₅"];
// contains[i][j]: is S_j a member of S_i?
const contains = [
  [true, true, false, false, false],
  [false, false, true, false, false],
  [true, false, true, false, true],
  [false, false, false, false, false],
  [false, true, false, true, false],
];
let rAdded = false;
let highlight = null; // row index whose difference with R is highlighted

const tick = (v) => (v ? "✓" : "·");

function renderMembership() {
  const r = russellRow(contains);
  const cols = [...NAMES, ...(rAdded ? ["R"] : [])];

  const head = h("tr", {}, h("th", { scope: "col" }, "Set"), ...cols.map((c) => h("th", { scope: "col", class: "col-head" }, c)), h("th", { scope: "col" }, "Equal to R?"));

  const body = contains.map((row, i) =>
    h(
      "tr",
      { class: highlight === i ? "is-highlight" : "" },
      h("th", { scope: "row" }, NAMES[i]),
      ...row.map((v, j) =>
        h(
          "td",
          { class: `${i === j ? "is-diag" : ""}${highlight === i && j === i ? " is-diff" : ""}`, style: { "--i": i } },
          h(
            "button",
            {
              type: "button",
              class: "cell",
              "aria-pressed": String(v),
              "aria-label": `${NAMES[j]} ${v ? "is" : "is not"} a member of ${NAMES[i]}`,
              on: {
                click: () => {
                  contains[i][j] = !contains[i][j];
                  renderMembership();
                },
              },
            },
            tick(v),
          ),
        ),
      ),
      ...(rAdded ? [h("td", { class: "muted" }, "·")] : []),
      h(
        "td",
        {},
        h(
          "button",
          {
            type: "button",
            class: "btn btn-sm",
            "aria-pressed": String(highlight === i),
            on: {
              click: () => {
                highlight = highlight === i ? null : i;
                renderMembership();
              },
            },
          },
          `No: differs at ${NAMES[i]}`,
        ),
      ),
    ),
  );

  const rRow = h(
    "tr",
    { class: "r-row" },
    h("th", { scope: "row" }, "R"),
    ...r.map((v, j) => h("td", { class: highlight === j ? "is-diff" : "", style: { "--i": j } }, h("span", { class: "cell is-static", "aria-label": `${NAMES[j]} ${v ? "is" : "is not"} in R` }, tick(v)))),
    ...(rAdded ? [h("td", { class: "is-diag is-paradox", style: { "--i": NAMES.length } }, h("span", { class: "cell is-static", "aria-label": "Is R in R? undefined" }, "?"))] : []),
    h("td", { class: "muted" }, "(the flipped diagonal)"),
  );

  $("#membership").replaceChildren(
    h("caption", { class: "visually-hidden" }, "Membership table: rows are sets, columns are possible members"),
    h("thead", {}, head),
    h("tbody", {}, ...body, rRow),
  );

  const selfMembers = contains.map((row, i) => (row[i] ? NAMES[i] : null)).filter(Boolean);
  $("#diag-note").innerHTML =
    highlight == null
      ? `<p>Self-members right now: <strong>${selfMembers.join(", ") || "none"}</strong>. So \\(R\\) contains exactly the others: <strong>${NAMES.filter((_, j) => r[j]).join(", ") || "none"}</strong>. Click a “differs at” button to see why \\(R\\) can’t be any row.</p>`
      : `<p><strong>${NAMES[highlight]}</strong> ${contains[highlight][highlight] ? "contains" : "does not contain"} itself, so \\(R\\) ${r[highlight] ? "contains" : "does not contain"} <strong>${NAMES[highlight]}</strong>. They disagree on the diagonal cell, so \\(R\\) ≠ ${NAMES[highlight]}. This happens for every row, whatever you click.</p>`;
  renderMath($("#diag-note"));
}

$("#add-r").addEventListener("click", () => {
  rAdded = true;
  // Sweep down the diagonal: each self-membership cell flips into R's row, one by one.
  $("#membership").classList.remove("is-sweeping");
  requestAnimationFrame(() => $("#membership").classList.add("is-sweeping"));
  $("#add-r").disabled = true;
  $("#r-test").hidden = false;
  renderMembership();
});

$$("[data-r]").forEach((b) =>
  b.addEventListener("click", () => {
    const t = testRussell(b.dataset.r === "true");
    $$("[data-r]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $("#r-result").className = "callout is-bad";
    $("#r-result").innerHTML = t.assumed
      ? "<p><strong>Contradiction.</strong> If \\(R \\in R\\), then \\(R\\) is a set that contains itself, and \\(R\\) only contains sets that <em>don’t</em>. So \\(R \\notin R\\).</p>"
      : "<p><strong>Contradiction.</strong> If \\(R \\notin R\\), then \\(R\\) is a set that doesn’t contain itself, which is exactly what qualifies a set for \\(R\\). So \\(R \\in R\\).</p><p>The cell \\((R, R)\\) must equal its own opposite. <strong>\\(R\\) cannot exist.</strong></p>";
    renderMath($("#r-result"));
  }),
);

renderVillage();
renderMembership();
