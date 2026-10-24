// Page logic: wire controls to the model and draw. Keep maths in model.js.
import { mountPage } from "../../assets/js/page.js";
import { $, bindRange } from "../../assets/js/lib/dom.js";
import { lineChart } from "../../assets/js/lib/chart.js";
import { fmt } from "../../assets/js/lib/format.js";
import { curve, valueAt } from "./model.js";

mountPage(); // header, footer, hero, guess widget, KaTeX, pager

const chart = lineChart($("#chart"), {
  x: { domain: [1, 100], label: "n", format: (v) => fmt(v) },
  y: { domain: [0, 10000], label: "f(n)", format: (v) => fmt(v) },
  series: [{ id: "f", label: "f(n) = n²", color: "var(--chart-1)" }],
  ariaLabel: "f(n) for n from 1 to 100",
});
chart.set("f", curve(100));

bindRange($("#n"), {
  output: $("#n-out"),
  format: (v) => fmt(v),
  onInput(n) {
    chart.setMarkers([{ x: n, y: valueAt(n), label: `f(${n}) = ${fmt(valueAt(n))}` }]);
    $("#stats").innerHTML = `<div class="stat"><div class="stat-label">f(n)</div><div class="stat-value">${fmt(valueAt(n))}</div></div>`;
  },
});
