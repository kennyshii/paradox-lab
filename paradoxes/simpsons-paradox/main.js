import { mountPage } from "../../assets/js/page.js";
import { $, h, segmented } from "../../assets/js/lib/dom.js";
import { fmt, pct } from "../../assets/js/lib/format.js";
import { DATASETS, rate, pooled, mix, standardised, summarise } from "./model.js";

mountPage();

let data = DATASETS.kidney;
let enabled = data.groups.map(() => true);
let fair = false;

const active = () => data.groups.filter((_, i) => enabled[i]);

function bar(arm, value, counts) {
  return h(
    "div",
    { class: `bar-row arm-${arm}` },
    h("span", { class: "bar-track" }, h("span", { class: "bar-fill", style: { width: `${value * 100}%` } })),
    h("span", { class: "bar-value" }, pct(value, 0), h("span", { class: "bar-n" }, counts ? ` ${fmt(counts[0])}/${fmt(counts[1])}` : "")),
  );
}

function renderToggles() {
  $("#toggles").replaceChildren(
    ...data.groups.map((g, i) =>
      h(
        "label",
        { class: "check chip" },
        h("input", {
          type: "checkbox",
          checked: enabled[i],
          on: {
            change: (e) => {
              enabled[i] = e.target.checked;
              render();
            },
          },
        }),
        g.name,
      ),
    ),
  );
}

function render() {
  const groups = active();
  $("#source").textContent = `Data: ${data.source}.`;
  $("#legend").innerHTML = `<li><span class="swatch" style="--swatch:var(--chart-1)"></span>${data.a}</li><li><span class="swatch" style="--swatch:var(--chart-2)"></span>${data.b}</li>`;

  if (!groups.length) {
    $("#bars").replaceChildren(h("p", { class: "hint" }, "Select at least one group."));
    $("#mix").replaceChildren();
    $("#verdict").className = "";
    $("#verdict").innerHTML = "";
    $("#fair-out").innerHTML = "";
    return;
  }

  const s = summarise(groups);
  const nameOf = (arm) => (arm === "a" ? data.a : data.b);

  // bars per group + overall
  const rows = groups.map((g) =>
    h("div", { class: "bar-group" }, h("div", { class: "bar-label" }, g.name, rate(g.a) > rate(g.b) ? h("span", { class: "win win-a" }, "A ahead") : h("span", { class: "win win-b" }, "B ahead")), bar("a", rate(g.a), g.a), bar("b", rate(g.b), g.b)),
  );
  const pa = pooled(groups, "a");
  const pb = pooled(groups, "b");
  rows.push(
    h(
      "div",
      { class: "bar-group is-total" },
      h("div", { class: "bar-label" }, groups.length > 1 ? "All selected groups combined" : "Overall (one group)", s.overallA > s.overallB ? h("span", { class: "win win-a" }, "A ahead") : h("span", { class: "win win-b" }, "B ahead")),
      bar("a", rate(pa), pa),
      bar("b", rate(pb), pb),
    ),
  );
  $("#bars").replaceChildren(...rows);

  // verdict
  const shortA = data.a.split(" (")[0];
  const shortB = data.b.split(" (")[0];
  $("#verdict").className = `callout ${s.reversed ? "is-warn" : ""}`;
  $("#verdict").innerHTML = s.reversed
    ? `<p><strong>Reversal!</strong> ${s.aWins > s.bWins ? shortA : shortB} is ahead in ${Math.max(s.aWins, s.bWins)} of ${groups.length} groups, but ${s.overallA > s.overallB ? shortA : shortB} is ahead overall (${pct(s.overallA)} vs ${pct(s.overallB)}).</p>`
    : `<p>No reversal with this selection: ${shortA} leads in ${s.aWins} of ${groups.length} group${groups.length > 1 ? "s" : ""}, and overall it’s ${pct(s.overallA)} vs ${pct(s.overallB)}. Try toggling groups.</p>`;

  // mix bars: darker colour for harder (lower-rate) groups
  const difficulty = groups.map((g) => rate(pooled([g], "a").map((v, i) => v + g.b[i])));
  const lo = Math.min(...difficulty);
  const hi = Math.max(...difficulty);
  const shade = (d) => (hi === lo ? 40 : 20 + 40 * ((hi - d) / (hi - lo)));
  $("#mix").replaceChildren(
    ...["a", "b"].map((arm) => {
      const w = mix(groups, arm);
      return h(
        "div",
        { class: "mix-row" },
        h("div", { class: "mix-label" }, nameOf(arm)),
        h(
          "div",
          { class: "mix-bar", role: "img", "aria-label": `${nameOf(arm)}: ${groups.map((g, i) => `${pct(w[i], 0)} ${g.name}`).join(", ")}` },
          ...groups.map((g, i) =>
            h("span", { class: "mix-seg", title: `${g.name}: ${pct(w[i], 0)} of cases`, style: { width: `${w[i] * 100}%`, background: `color-mix(in srgb, var(--chart-4) ${shade(difficulty[i])}%, var(--surface-2))` } }, w[i] > 0.12 ? `${g.name.replace("Department ", "")} ${pct(w[i], 0)}` : ""),
          ),
        ),
      );
    }),
  );

  const fa = standardised(groups, "a");
  const fb = standardised(groups, "b");
  $("#fair-out").innerHTML = fair
    ? `<div class="stats" style="margin-top:0.75rem"><div class="stat"><div class="stat-label">${shortA}, same mix</div><div class="stat-value" style="color:var(--chart-1)">${pct(fa)}</div></div><div class="stat"><div class="stat-label">${shortB}, same mix</div><div class="stat-value" style="color:var(--chart-2)">${pct(fb)}</div></div></div><p class="hint" style="margin-top:0.5rem">With identical case mixes, ${fa > fb ? shortA : shortB} comes out ahead${s.aWins > s.bWins === fa > fb ? ", matching the group-by-group comparison" : ""}.</p>`
    : "";
}

$("#fair").addEventListener("change", (e) => {
  fair = e.target.checked;
  render();
});

segmented($("[data-dataset]"), {
  onChange(key) {
    data = DATASETS[key];
    enabled = data.groups.map(() => true);
    renderToggles();
    render();
  },
});

renderToggles();
render();
