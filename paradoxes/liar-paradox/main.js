import { mountPage } from "../../assets/js/page.js";
import { $, h, segmented } from "../../assets/js/lib/dom.js";
import { FACTS, PRESETS, truthTable, verdict, revise } from "./model.js";

mountPage();

let sentences = PRESETS.liar.sentences.map((s) => ({ ...s }));
let start = [true];

const name = (i) => `S${i + 1}`;
const tv = (v) => h("span", { class: `tv ${v ? "is-t" : "is-f"}`, "aria-label": v ? "true" : "false" }, v ? "T" : "F");

// ---------- Editor ----------

const countControl = segmented($("[data-count]"), {
  onChange(v) {
    const n = Number(v);
    sentences = Array.from({ length: n }, (_, i) => {
      const s = sentences[i] ?? { target: i, claim: false };
      return typeof s.target === "number" && s.target >= n ? { ...s, target: i } : s;
    });
    render();
  },
});

function sentenceText(s, i) {
  const target = typeof s.target === "number" ? (s.target === i ? "This sentence" : `Sentence ${name(s.target)}`) : FACTS[s.target].label;
  return `${target} is ${s.claim ? "true" : "false"}.`;
}

function renderEditor() {
  const n = sentences.length;
  $("#sentences").replaceChildren(
    ...sentences.map((s, i) => {
      const targetSel = h(
        "select",
        {
          "aria-label": `${name(i)} talks about`,
          on: {
            change: (e) => {
              const v = e.target.value;
              s.target = v in FACTS ? v : Number(v);
              render();
            },
          },
        },
        ...Array.from({ length: n }, (_, j) => h("option", { value: j, selected: s.target === j }, j === i ? `${name(j)} (itself)` : name(j))),
        ...Object.entries(FACTS).map(([id, f]) => h("option", { value: id, selected: s.target === id }, f.label)),
      );
      const claimSel = h(
        "select",
        {
          "aria-label": `${name(i)} claims its subject is`,
          on: {
            change: (e) => {
              s.claim = e.target.value === "true";
              render();
            },
          },
        },
        h("option", { value: "true", selected: s.claim }, "true"),
        h("option", { value: "false", selected: !s.claim }, "false"),
      );
      return h(
        "li",
        { class: "sentence" },
        h("span", { class: "sentence-name" }, name(i)),
        h("span", { class: "sentence-edit" }, "says: ", targetSel, " is ", claimSel),
        h("q", { class: "sentence-text" }, sentenceText(s, i)),
      );
    }),
  );
}

// ---------- Truth table ----------

function renderTable() {
  const rows = truthTable(sentences);
  const n = sentences.length;
  const head = h(
    "tr",
    {},
    ...sentences.map((_, i) => h("th", { scope: "col" }, `${name(i)} is`)),
    ...sentences.map((_, i) => h("th", { scope: "col" }, `${name(i)}’s claim`)),
    h("th", { scope: "col" }, "Consistent?"),
  );
  const body = rows.map((r) =>
    h(
      "tr",
      { class: r.consistent ? "is-consistent" : "" },
      ...r.assignment.map((v) => h("td", {}, tv(v))),
      ...r.claims.map((c, i) => h("td", { class: c === r.assignment[i] ? "" : "is-clash" }, tv(c))),
      h("td", {}, r.consistent ? h("strong", { class: "ok" }, "✓ yes") : h("span", { class: "no" }, "✗ no")),
    ),
  );
  $("#table").replaceChildren(
    h("caption", { class: "visually-hidden" }, `Truth table for ${n} sentence${n > 1 ? "s" : ""}`),
    h("thead", {}, head),
    h("tbody", {}, ...body),
  );

  const v = verdict(sentences);
  const text = {
    paradox: ["is-bad", "Paradox: no consistent assignment.", "Every row has a clash. Whatever values you choose, some sentence ends up saying the opposite of what it is."],
    grounded: ["is-good", "Grounded: exactly one consistent assignment.", "These sentences have a definite truth value."],
    underdetermined: ["is-warn", `Underdetermined: ${v.count} consistent assignments.`, "No contradiction, but nothing fixes which values are the right ones."],
  }[v.kind];
  $("#verdict").className = `callout ${text[0]}`;
  $("#verdict").innerHTML = `<p><strong>${text[1]}</strong> ${text[2]}</p>`;
}

// ---------- Revision sequence ----------

function renderRevision() {
  start = sentences.map((_, i) => start[i] ?? true);
  $("#start").replaceChildren(
    h("span", { class: "hint", style: { margin: 0 } }, "Start with:"),
    ...sentences.map((_, i) =>
      h(
        "button",
        {
          type: "button",
          class: "btn btn-sm",
          "aria-pressed": String(start[i]),
          "aria-label": `${name(i)} starts ${start[i] ? "true" : "false"}; press to flip`,
          on: {
            click: () => {
              start[i] = !start[i];
              renderRevision();
            },
          },
        },
        `${name(i)} = ${start[i] ? "T" : "F"}`,
      ),
    ),
  );

  const seq = revise(sentences, start, 8);
  const stable = seq.findIndex((row, k) => k > 0 && row.every((v, i) => v === seq[k - 1][i]));
  const table = h(
    "table",
    { class: "data revision-table" },
    h("caption", { class: "visually-hidden" }, "Revision sequence"),
    h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Round"), ...seq.map((_, k) => h("th", { scope: "col" }, String(k))))),
    h("tbody", {}, ...sentences.map((_, i) => h("tr", {}, h("th", { scope: "row" }, name(i)), ...seq.map((row) => h("td", {}, tv(row[i])))))),
  );
  const note =
    stable > 0
      ? h("p", { class: "hint ok" }, `Settles after round ${stable - 1}: a fixed point.`)
      : h("p", { class: "hint no" }, "Never settles: it keeps flipping.");
  $("#revision").replaceChildren(h("div", { class: "table-wrap" }, table), note);
}

// ---------- Presets ----------

$("#presets").replaceChildren(
  ...Object.values(PRESETS).map((p) =>
    h(
      "button",
      {
        type: "button",
        class: "btn btn-sm",
        on: {
          click: () => {
            sentences = p.sentences.map((s) => ({ ...s }));
            countControl.set(String(sentences.length), { silent: true });
            render();
          },
        },
      },
      p.label,
    ),
  ),
);

function render() {
  renderEditor();
  renderTable();
  renderRevision();
}

render();
