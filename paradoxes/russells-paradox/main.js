import { mountPage, renderMath } from "../../assets/js/page.js";
import { $, $$, h, segmented } from "../../assets/js/lib/dom.js";
import { barberShaves, testBarber, russellRow, testRussell } from "./model.js";

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
          { class: `${i === j ? "is-diag" : ""}${highlight === i && j === i ? " is-diff" : ""}` },
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
    ...r.map((v, j) => h("td", { class: highlight === j ? "is-diff" : "" }, h("span", { class: "cell is-static", "aria-label": `${NAMES[j]} ${v ? "is" : "is not"} in R` }, tick(v)))),
    ...(rAdded ? [h("td", { class: "is-diag is-paradox" }, h("span", { class: "cell is-static", "aria-label": "Is R in R? undefined" }, "?"))] : []),
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
