import { mountPage } from "../../assets/js/page.js";
import { $, h, bindRange } from "../../assets/js/lib/dom.js";
import { fmt } from "../../assets/js/lib/format.js";
import { stageCanvas } from "../../assets/js/lib/fx.js";
import { prefersReducedMotion } from "../../assets/js/lib/sim.js";
import { explainer } from "../../assets/js/lib/explainer.js";
import { story, STEPS } from "./model.js";
import { drawMoney } from "./scene.js";
import { scenes } from "./explainer.js";

mountPage();

// ---------- Follow every coin ----------

let step = 0;
let from = 0;
let started = 0;
let mode = null;
let modeAt = 0;

const progress = () => (prefersReducedMotion() ? 1 : Math.min(1, (performance.now() - started) / 1300));

const stage = stageCanvas($("#money"), {
  aspect: 16 / 9,
  minHeight: 280,
  maxHeight: 560,
  animate: true,
  label: STEPS[0],
  draw(ctx, w, hh, t) {
    const u = Math.min(w, (hh * 16) / 9) / 100;
    const q = mode ? Math.min(1, (performance.now() - modeAt) / 1200) : progress();
    drawMoney(ctx, w, hh, { from: mode ? step : from, to: step, q, u, t, mode });
  },
});

const dots = $("#dots");
dots.replaceChildren(...STEPS.map((s, i) => h("li", {}, h("button", { type: "button", "aria-label": `Step ${i + 1}: ${s}`, on: { click: () => go(i) } }))));

function go(k) {
  k = Math.max(0, Math.min(STEPS.length - 1, k));
  from = step;
  step = k;
  started = performance.now();
  setMode(null);
  $("#story").textContent = STEPS[step];
  stage.setLabel(STEPS[step]);
  $("#back").disabled = step === 0;
  $("#next").disabled = step === STEPS.length - 1;
  [...dots.children].forEach((li, i) => li.classList.toggle("is-on", i <= step));
  const final = step >= 3;
  $("#show-wrong").disabled = !final;
  $("#show-right").disabled = !final;
}

function setMode(m) {
  mode = m;
  modeAt = performance.now();
  $("#show-wrong").setAttribute("aria-pressed", String(m === "wrong"));
  $("#show-right").setAttribute("aria-pressed", String(m === "highlight"));
  if (m === "wrong") $("#story").textContent = "The riddle adds the friends’ $27 to the bellhop’s $2 and gets $29. But that $2 is already inside the $27.";
  if (m === "highlight") $("#story").textContent = "The friends’ $27 sits in two places: $25 at the desk and $2 with the bellhop. Add the $3 they got back: $30.";
}

$("#back").addEventListener("click", () => go(step - 1));
$("#next").addEventListener("click", () => go(step + 1));
$("#show-wrong").addEventListener("click", () => setMode(mode === "wrong" ? null : "wrong"));
$("#show-right").addEventListener("click", () => setMode(mode === "highlight" ? null : "highlight"));
go(0);

// ---------- Change the numbers ----------

const money = (v) => `$${fmt(v, Number.isInteger(v) ? 0 : 2)}`;
const params = { price: 25, kept: 2 };

function renderSums() {
  const s = story(params);
  const gap = s.paid - s.wrongSum;
  $("#wrong-math").textContent = `${money(s.friendsPaid)} + ${money(s.kept)} = ${money(s.wrongSum)}`;
  $("#wrong-note").textContent =
    gap === 0 ? "By coincidence it matches $30 this time, but it’s still the wrong sum." : gap > 0 ? `${money(gap)} seems to be “missing”.` : `${money(-gap)} seems to have appeared from nowhere!`;
  $("#right-math").textContent = `${money(s.price)} + ${money(s.kept)} + ${money(s.returned)} = ${money(s.price + s.kept + s.returned)}`;
}

const keptInput = $("#kept");
const syncKept = bindRange(keptInput, {
  output: $("#kept-out"),
  format: money,
  onInput(v) {
    params.kept = v;
    renderSums();
  },
});

bindRange($("#price"), {
  output: $("#price-out"),
  format: money,
  onInput(v) {
    params.price = v;
    keptInput.max = String(30 - v);
    if (Number(keptInput.value) > 30 - v) keptInput.value = String(30 - v);
    syncKept();
  },
});
explainer($("[data-explainer]"), { title: "The missing dollar, explained", scenes });
