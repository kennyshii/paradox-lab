import { mountPage } from "../../assets/js/page.js";
import { $, $$, h, bindRange } from "../../assets/js/lib/dom.js";
import { lineChart } from "../../assets/js/lib/chart.js";
import { runTrials } from "../../assets/js/lib/sim.js";
import { fmt, pct } from "../../assets/js/lib/format.js";
import { pShared, pSharesMine, pairs, sampleGroup } from "./model.js";

mountPage();

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const dayName = (d) => {
  let m = 0;
  while (d >= LENGTHS[m]) d -= LENGTHS[m++];
  return `${MONTHS[m]} ${d + 1}`;
};

let n = 23;
let mc = null; // { n, trials, matches }
let running = null;

// ---------- Curve ----------

const exact = Array.from({ length: 100 }, (_, i) => [i + 1, pShared(i + 1)]);
const mine = Array.from({ length: 100 }, (_, i) => [i + 1, pSharesMine(i + 1)]);

const chart = lineChart($("#curve"), {
  height: 300,
  x: { domain: [1, 100], label: "People in the room", format: (v) => fmt(v) },
  y: { domain: [0, 1], label: "Probability", format: (v) => pct(v, 0) },
  series: [
    { id: "exact", label: "Some two people share a birthday", color: "var(--chart-1)", fill: true },
    { id: "mine", label: "Someone shares your birthday", color: "var(--chart-2)", dashed: true },
  ],
  ariaLabel: "Probability of a shared birthday by group size.",
});
chart.setMany({ exact, mine });
chart.setLines({ h: [{ y: 0.5, label: "50%" }] });

function renderCurve() {
  const markers = [{ x: n, y: pShared(n), color: "var(--chart-1)", label: `${n} people: ${pct(pShared(n))}` }];
  if (mc && mc.n === n && mc.trials) markers.push({ x: n, y: mc.matches / mc.trials, color: "var(--chart-3)", r: 4 });
  chart.setMarkers(markers);
  chart.setLines({ h: [{ y: 0.5, label: "50%" }], v: [{ x: n, color: "var(--line-strong)" }] });
  chart.setAriaLabel(`With ${n} people the chance of a shared birthday is ${pct(pShared(n))}; the chance someone shares yours is ${pct(pSharesMine(n))}.`);
}

function renderStats() {
  $("#stats").innerHTML = `
    <div class="stat is-hero"><div class="stat-label">Chance of a shared birthday</div><div class="stat-value" style="color:var(--chart-1)">${pct(pShared(n))}</div></div>
    <div class="stat"><div class="stat-label">Pairs of people</div><div class="stat-value">${fmt(pairs(n))}</div><div class="stat-note">each pair is a chance to match</div></div>
    <div class="stat"><div class="stat-label">Someone shares <em>yours</em></div><div class="stat-value" style="color:var(--chart-2)">${pct(pSharesMine(n))}</div><div class="stat-note">only ${Math.max(0, n - 1)} chances</div></div>`;
}

// ---------- Calendar ----------

const calendar = $("#calendar");
const cells = [];
MONTHS.forEach((name, m) => {
  calendar.append(h("span", { class: "cal-month" }, name));
  for (let d = 0; d < 31; d++) {
    const cell = h("span", { class: `cal-day${d >= LENGTHS[m] ? " is-void" : ""}` });
    calendar.append(cell);
    if (d < LENGTHS[m]) cells.push(cell);
  }
});

function showGroup(group) {
  cells.forEach((c, i) => {
    const count = group?.counts.get(i) ?? 0;
    c.className = `cal-day${count === 1 ? " is-one" : count > 1 ? " is-many" : ""}`;
    c.textContent = count > 1 ? String(count) : "";
  });
  if (!group) {
    $("#sample-summary").textContent = "Sample a group to see its birthdays on the calendar.";
    return;
  }
  $("#sample-summary").innerHTML = group.hasMatch
    ? `<strong>Match!</strong> ${group.shared.map((s) => `${s.count} people share ${dayName(s.day)}`).join("; ")}.`
    : `<strong>No match</strong> in this group of ${n}. Try again; it happens ${pct(1 - pShared(n), 0)} of the time.`;
}

// ---------- Monte Carlo ----------

function renderMc() {
  const box = $("#mc-stats");
  if (!mc || mc.n !== n) {
    box.innerHTML = "";
    return;
  }
  const est = mc.matches / mc.trials;
  box.innerHTML = `
    <div class="stat"><div class="stat-label">Groups simulated</div><div class="stat-value">${fmt(mc.trials)}</div><div class="stat-note">of ${n} people each</div></div>
    <div class="stat"><div class="stat-label">Had a match</div><div class="stat-value" style="color:var(--chart-3)">${pct(est)}</div><div class="stat-note">${fmt(mc.matches)} groups</div></div>
    <div class="stat"><div class="stat-label">Formula says</div><div class="stat-value" style="color:var(--chart-1)">${pct(pShared(n))}</div><div class="stat-note">difference ${pct(Math.abs(est - pShared(n)), 1)}</div></div>`;
}

function runMc(total) {
  if (running) return;
  if (!mc || mc.n !== n) mc = { n, trials: 0, matches: 0 };
  let last;
  $$("[data-mc], #sample-one").forEach((b) => (b.disabled = true));
  running = runTrials({
    total,
    frames: 60,
    trial() {
      last = sampleGroup(n);
      mc.trials++;
      if (last.hasMatch) mc.matches++;
    },
    onProgress() {
      showGroup(last);
      renderMc();
      renderCurve();
    },
    onDone() {
      running = null;
      $$("[data-mc], #sample-one").forEach((b) => (b.disabled = false));
    },
  });
}

$("#sample-one").addEventListener("click", () => {
  if (!mc || mc.n !== n) mc = { n, trials: 0, matches: 0 };
  const g = sampleGroup(n);
  mc.trials++;
  if (g.hasMatch) mc.matches++;
  showGroup(g);
  renderMc();
  renderCurve();
});
$$("[data-mc]").forEach((b) => b.addEventListener("click", () => runMc(Number(b.dataset.mc))));

bindRange($("#n"), {
  output: $("#n-out"),
  format: (v) => `${v} ${v === 1 ? "person" : "people"}`,
  onInput(v) {
    n = v;
    renderStats();
    renderCurve();
    renderMc();
    if (!running) showGroup(null);
  },
});
