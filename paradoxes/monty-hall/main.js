import { mountPage } from "../../assets/js/page.js";
import { $, $$, h, segmented } from "../../assets/js/lib/dom.js";
import { lineChart } from "../../assets/js/lib/chart.js";
import { Tally, runTrials, prefersReducedMotion } from "../../assets/js/lib/sim.js";
import { fmt, pct, fraction } from "../../assets/js/lib/format.js";
import { newRound, hostLeavesClosed, hostOpens, simulate, theory } from "./model.js";

mountPage();

let doorCount = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, prefersReducedMotion() ? 0 : ms));

// ---------- The game ----------

const doorsBox = $("#doors");
const prompt = $("#game-prompt");
const actions = $("#game-actions");
const played = new Tally(["stay", "switch"]);
const counts = { stay: 0, switch: 0 };
let game;

function newGame() {
  game = { round: newRound(doorCount), phase: "pick", pick: null, other: null, open: new Set(), choice: null };
  doorsBox.className = `doors doors-${doorCount}`;
  doorsBox.replaceChildren(
    ...[...Array(doorCount).keys()].map((i) =>
      h("button", { type: "button", class: "door", dataset: { door: i }, on: { click: () => onDoor(i) } }, h("span", { class: "door-num" }, String(i + 1)), h("span", { class: "door-prize", "aria-hidden": "true" })),
    ),
  );
  renderGame();
}

function doorLabel(i) {
  const parts = [`Door ${i + 1}`];
  if (game.open.has(i)) parts.push(i === game.round.car ? "car" : "goat");
  if (i === game.pick) parts.push("your pick");
  if (game.phase === "decide" && i === game.other) parts.push("still closed");
  return parts.join(", ");
}

function renderGame() {
  for (const btn of $$(".door", doorsBox)) {
    const i = Number(btn.dataset.door);
    const isOpen = game.open.has(i);
    btn.classList.toggle("is-open", isOpen);
    btn.classList.toggle("is-picked", i === game.pick);
    btn.classList.toggle("is-other", game.phase === "decide" && i === game.other);
    btn.classList.toggle("is-car", isOpen && i === game.round.car);
    btn.classList.toggle("is-final", game.phase === "done" && i === game.final);
    $(".door-prize", btn).textContent = isOpen ? (i === game.round.car ? "🚗" : "🐐") : "";
    btn.setAttribute("aria-label", doorLabel(i));
    const clickable = game.phase === "pick" || (game.phase === "decide" && (i === game.pick || i === game.other));
    btn.disabled = !clickable;
  }

  actions.replaceChildren();
  if (game.phase === "pick") {
    prompt.textContent = `Pick a door. One of the ${doorCount} hides a car.`;
  } else if (game.phase === "opening") {
    prompt.textContent = `The host opens ${doorCount === 3 ? "a door" : `${doorCount - 2} doors`} with a goat…`;
  } else if (game.phase === "decide") {
    prompt.textContent = `The host left door ${game.other + 1} closed. Stay with door ${game.pick + 1}, or switch?`;
    actions.append(
      h("button", { type: "button", class: "btn", on: { click: () => decide("stay") } }, `Stay with door ${game.pick + 1}`),
      h("button", { type: "button", class: "btn btn-primary", on: { click: () => decide("switch") } }, `Switch to door ${game.other + 1}`),
    );
  } else {
    const won = game.final === game.round.car;
    prompt.textContent = `${won ? "You win the car! 🎉" : "A goat. 🐐"} You chose to ${game.choice}. ${game.choice === "stay" ? "Switching" : "Staying"} would have ${won ? "lost" : "won"}.`;
    actions.append(h("button", { type: "button", class: "btn btn-primary", on: { click: newGame } }, "Play again"));
  }

  const line = (k) => (counts[k] ? `${played.wins[k]} / ${counts[k]} won` : "not tried yet");
  $("#game-stats").innerHTML = `
    <div class="stat"><div class="stat-label">When you stayed</div><div class="stat-value">${counts.stay ? pct(played.wins.stay / counts.stay, 0) : "–"}</div><div class="stat-note">${line("stay")}</div></div>
    <div class="stat"><div class="stat-label">When you switched</div><div class="stat-value">${counts.switch ? pct(played.wins.switch / counts.switch, 0) : "–"}</div><div class="stat-note">${line("switch")}</div></div>`;
}

async function onDoor(i) {
  if (game.phase === "pick") {
    game.pick = i;
    game.other = hostLeavesClosed(game.round, i);
    game.phase = "opening";
    renderGame();
    const toOpen = hostOpens(game.round, i, game.other);
    const delay = doorCount === 3 ? 650 : doorCount === 10 ? 160 : 18;
    await sleep(350);
    for (const d of toOpen) {
      game.open.add(d);
      renderGame();
      await sleep(delay);
    }
    game.phase = "decide";
    renderGame();
    $(".door.is-other", doorsBox)?.focus();
  } else if (game.phase === "decide") {
    decide(i === game.pick ? "stay" : "switch");
  }
}

function decide(choice) {
  game.choice = choice;
  game.final = choice === "stay" ? game.pick : game.other;
  game.phase = "done";
  for (let d = 0; d < doorCount; d++) game.open.add(d);
  counts[choice]++;
  played.trials++;
  if (game.final === game.round.car) played.wins[choice]++;
  renderGame();
  actions.querySelector("button")?.focus();
}

// ---------- The simulation ----------

const sim = new Tally(["stay", "switch"]);
let series = { stay: [], switch: [] };
let running = null;

const chart = lineChart($("#sim-chart"), {
  height: 280,
  x: { domain: [0, 100], label: "Rounds played", format: (v) => fmt(v) },
  y: { domain: [0, 1], label: "Win rate", format: (v) => pct(v, 0) },
  series: [
    { id: "switch", label: "Always switch", color: "var(--chart-3)" },
    { id: "stay", label: "Always stay", color: "var(--chart-2)" },
  ],
  ariaLabel: "Running win rate for staying versus switching.",
});

function renderSim() {
  const th = theory(doorCount);
  $("#sim-stats").innerHTML = `
    <div class="stat"><div class="stat-label">Rounds</div><div class="stat-value">${fmt(sim.trials)}</div></div>
    <div class="stat"><div class="stat-label">Stay wins</div><div class="stat-value" style="color:var(--chart-2)">${sim.trials ? pct(sim.rate("stay")) : "–"}</div><div class="stat-note">theory: ${fraction(th.stay, 100)} ≈ ${pct(th.stay)}</div></div>
    <div class="stat"><div class="stat-label">Switch wins</div><div class="stat-value" style="color:var(--chart-3)">${sim.trials ? pct(sim.rate("switch")) : "–"}</div><div class="stat-note">theory: ${fraction(th.switch, 100)} ≈ ${pct(th.switch)}</div></div>`;
  chart.setAxis("x", { domain: [0, Math.max(100, sim.trials)] });
  chart.setLines({
    h: [
      { y: th.switch, label: `${fraction(th.switch, 100)}`, color: "var(--chart-3)" },
      { y: th.stay, label: `${fraction(th.stay, 100)}`, color: "var(--chart-2)" },
    ],
  });
  chart.setMany(series);
  chart.setAriaLabel(`After ${fmt(sim.trials)} rounds with ${doorCount} doors: staying won ${pct(sim.rate("stay"))}, switching won ${pct(sim.rate("switch"))}.`);
}

function run(n) {
  if (running) return;
  const target = sim.trials + n;
  const every = Math.max(1, Math.floor(target / 400)); // keep ~400 points per series
  $$("[data-run]").forEach((b) => (b.disabled = true));
  running = runTrials({
    total: n,
    frames: n <= 100 ? 60 : 120,
    trial() {
      sim.record(simulate(doorCount));
      if (sim.trials % every === 0 || sim.trials < 30) {
        series.stay.push([sim.trials, sim.rate("stay")]);
        series.switch.push([sim.trials, sim.rate("switch")]);
      }
    },
    onProgress: renderSim,
    onDone() {
      running = null;
      $$("[data-run]").forEach((b) => (b.disabled = false));
      renderSim();
    },
  });
}

function resetSim() {
  running?.cancel();
  running = null;
  sim.reset();
  series = { stay: [], switch: [] };
  $$("[data-run]").forEach((b) => (b.disabled = false));
  renderSim();
}

$$("[data-run]").forEach((b) => b.addEventListener("click", () => run(Number(b.dataset.run))));
$("#sim-reset").addEventListener("click", resetSim);

segmented($("[data-doors]"), {
  onChange(v) {
    doorCount = Number(v);
    played.reset();
    counts.stay = counts.switch = 0;
    newGame();
    resetSim();
  },
});

newGame();
renderSim();
