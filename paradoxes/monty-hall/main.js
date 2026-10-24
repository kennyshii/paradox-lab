import { mountPage } from "../../assets/js/page.js";
import { $, $$, h, segmented } from "../../assets/js/lib/dom.js";
import { lineChart } from "../../assets/js/lib/chart.js";
import { Tally, runTrials, prefersReducedMotion } from "../../assets/js/lib/sim.js";
import { fmt, pct, fraction } from "../../assets/js/lib/format.js";
import { confetti, stageCanvas } from "../../assets/js/lib/fx.js";
import { newRound, hostLeavesClosed, hostOpens, simulate, theory } from "./model.js";
import { explainer } from "../../assets/js/lib/explainer.js";
import { scenes as explainerScenes } from "./explainer.js";

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
      h(
        "button",
        { type: "button", class: "door", dataset: { door: i }, style: { "--i": i }, on: { click: () => onDoor(i) } },
        h("span", { class: "door-prize", "aria-hidden": "true" }),
        h("span", { class: "door-leaf", "aria-hidden": "true" }, h("span", { class: "door-num" }, String(i + 1))),
      ),
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
  if (game.final === game.round.car) setTimeout(() => confetti($(".door.is-final", doorsBox)), 450);
}

// ---------- The simulation: two glass tubes fill with wins ----------

const sim = new Tally(["stay", "switch"]);
const drops = [];
const level = { stay: { x: 0, v: 0 }, switch: { x: 0, v: 0 } };
const TUBES = [
  { key: "stay", label: "Stay", color: "#ff8a4c" },
  { key: "switch", label: "Switch", color: "#32d583" },
];

function tubeGeom(w, h, k) {
  const tw = Math.min(110, w * 0.2);
  const cx = w * (k === 0 ? 0.32 : 0.68);
  return { x: cx - tw / 2, w: tw, top: 64, bottom: h - 46, cx };
}

const tubes = stageCanvas($("#tubes"), {
  aspect: 1,
  minHeight: 300,
  maxHeight: 400,
  animate: true,
  label: "Two tubes filling with stay wins and switch wins.",
  draw(ctx, w, h, t) {
    const th = theory(doorCount);
    TUBES.forEach((tube, k) => {
      const g = tubeGeom(w, h, k);
      const L = level[tube.key];
      const target = sim.trials ? sim.rate(tube.key) : 0;
      L.v += (target - L.x) * 0.08;
      L.v *= 0.82;
      L.x += L.v;
      const H = g.bottom - g.top;
      const surface = g.bottom - H * Math.max(0, L.x);

      // glass
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(g.x, g.top, g.w, H, [8, 8, g.w / 2, g.w / 2]);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fill();
      ctx.clip();
      // liquid with a moving wave on top
      const grad = ctx.createLinearGradient(0, surface, 0, g.bottom);
      grad.addColorStop(0, tube.color);
      grad.addColorStop(1, tube.color + "55");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(g.x, g.bottom);
      for (let x = 0; x <= g.w; x += 4) ctx.lineTo(g.x + x, surface + Math.sin(x / 11 + t * 3 + k) * 3 * Math.min(1, Math.abs(L.v) * 60 + 0.4));
      ctx.lineTo(g.x + g.w, g.bottom);
      ctx.fill();
      // glass highlight
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(g.x + g.w * 0.14, g.top + 10, g.w * 0.09, H - 30);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(g.x, g.top, g.w, H, [8, 8, g.w / 2, g.w / 2]);
      ctx.stroke();

      // theory mark
      const ty = g.bottom - H * th[tube.key];
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.moveTo(g.x - 10, ty);
      ctx.lineTo(g.x + g.w + 10, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "600 11px -apple-system, Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(fraction(th[tube.key], 100), g.x + g.w + 14, ty + 4);

      // labels
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "700 26px -apple-system, Inter, sans-serif";
      ctx.fillText(sim.trials ? pct(L.x, 0) : "–", g.cx, 44);
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "600 12px -apple-system, Inter, sans-serif";
      ctx.fillText(tube.label.toUpperCase(), g.cx, h - 20);
    });

    // falling drops
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      const g = tubeGeom(w, h, d.k);
      const surface = g.bottom - (g.bottom - g.top) * Math.max(0, level[TUBES[d.k].key].x);
      if (d.y == null) d.y = g.top + 4 + Math.random() * 10;
      d.vy += 0.5;
      d.y += d.vy;
      const x = g.x + g.w * d.u;
      if (d.y >= surface) {
        drops.splice(i, 1);
        continue;
      }
      ctx.fillStyle = TUBES[d.k].color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(x, d.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
});

function spawnDrop(outcome) {
  if (drops.length > 160) return;
  drops.push({ k: outcome.switch ? 1 : 0, u: 0.25 + Math.random() * 0.5, y: null, vy: Math.random() * 2 });
}

// ---------- The simulation ----------

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
      const outcome = simulate(doorCount);
      sim.record(outcome);
      if (Math.random() < 120 / n) spawnDrop(outcome);
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
  drops.length = 0;
  $$("[data-run]").forEach((b) => (b.disabled = false));
  renderSim();
  tubes.render();
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

explainer($("[data-explainer]"), { title: $("[data-explainer]").dataset.title, scenes: explainerScenes });
