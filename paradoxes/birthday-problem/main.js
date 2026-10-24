import { mountPage } from "../../assets/js/page.js";
import { $, $$, h, bindRange } from "../../assets/js/lib/dom.js";
import { lineChart } from "../../assets/js/lib/chart.js";
import { runTrials } from "../../assets/js/lib/sim.js";
import { fmt, pct } from "../../assets/js/lib/format.js";
import { stageCanvas, countTo } from "../../assets/js/lib/fx.js";
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

// ---------- Handshake web / year dial ----------

const MONTH_START = LENGTHS.reduce((acc, l, i) => (acc.push(i ? acc[i - 1] + LENGTHS[i - 1] : 0), acc), []);
const TAU = Math.PI * 2;
const nodes = Array.from({ length: 100 }, () => ({ a: -Math.PI / 2, v: 0, s: 0, sv: 0, flare: 0 }));
let web = { group: null, flareAt: 0 };

const dayAngle = (d) => -Math.PI / 2 + (TAU * (d + 0.5)) / 365;

const stage = stageCanvas($("#web"), {
  aspect: 1.35,
  minHeight: 340,
  maxHeight: 560,
  animate: true,
  label: "Every pair of people drawn as a line between points on a circle.",
  draw(ctx, w, h, t) {
    const cx = w / 2;
    const cy = h / 2 - 18;
    const R = Math.min(w, h) * 0.36;
    const g = web.group;

    // year dial
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
    const dialAlpha = g ? 0.7 : 0.25;
    ctx.font = "600 10px -apple-system, Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    MONTHS.forEach((m, i) => {
      const a = dayAngle(MONTH_START[i]) - (TAU * 0.5) / 365;
      ctx.strokeStyle = `rgba(255,255,255,${dialAlpha * 0.5})`;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6));
      ctx.lineTo(cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14));
      ctx.stroke();
      const am = dayAngle(MONTH_START[i] + LENGTHS[i] / 2);
      ctx.fillStyle = `rgba(255,255,255,${dialAlpha})`;
      ctx.fillText(m, cx + Math.cos(am) * (R + 26), cy + Math.sin(am) * (R + 26));
    });

    // spring each person toward their slot (evenly spaced) or birthday (sampled)
    const pos = [];
    for (let i = 0; i < 100; i++) {
      const node = nodes[i];
      const target = i < n ? (g ? dayAngle(g.birthdays[i]) : -Math.PI / 2 + (TAU * i) / n) : node.a;
      let diff = target - node.a;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      node.v = (node.v + diff * 0.06) * 0.8;
      node.a += node.v;
      node.sv = (node.sv + ((i < n ? 1 : 0) - node.s) * 0.12) * 0.72;
      node.s += node.sv;
      pos.push([cx + Math.cos(node.a) * R, cy + Math.sin(node.a) * R]);
    }

    // chords: every pair
    const m = n;
    const P = pairs(m);
    ctx.globalCompositeOperation = "lighter";
    const base = g ? 0.05 : Math.min(0.5, 2.2 / Math.sqrt(P + 1));
    for (let i = 0; i < m; i++) {
      for (let j = i + 1; j < m; j++) {
        const hue = 205 + ((i * 7 + j * 3) % 60);
        ctx.strokeStyle = `hsla(${hue}, 95%, 65%, ${base * Math.min(nodes[i].s, nodes[j].s)})`;
        ctx.beginPath();
        ctx.moveTo(pos[i][0], pos[i][1]);
        ctx.quadraticCurveTo(cx, cy, pos[j][0], pos[j][1]);
        ctx.stroke();
      }
    }

    // matches: flare at the shared day
    if (g?.hasMatch) {
      const age = t - web.flareAt;
      for (const sh of g.shared) {
        const a = dayAngle(sh.day);
        const x = cx + Math.cos(a) * R;
        const y = cy + Math.sin(a) * R;
        for (let k = 0; k < 3; k++) {
          const ph = (age * 0.8 + k / 3) % 1;
          ctx.strokeStyle = `rgba(255,120,80,${(1 - ph) * 0.8})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 6 + ph * 34, 0, TAU);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#fff";
        ctx.font = "700 12px -apple-system, Inter, sans-serif";
        ctx.fillText(dayName(sh.day), cx + Math.cos(a) * (R - 34), cy + Math.sin(a) * (R - 34));
        ctx.globalCompositeOperation = "lighter";
      }
    }

    // people
    for (let i = 0; i < 100; i++) {
      const s = nodes[i].s;
      if (s < 0.02) continue;
      const shared = g && (g.counts.get(g.birthdays[i]) ?? 0) > 1;
      const r = (shared ? 5.5 : 3.6) * s;
      const glow = ctx.createRadialGradient(pos[i][0], pos[i][1], 0, pos[i][0], pos[i][1], r * 4);
      glow.addColorStop(0, shared ? "rgba(255,140,90,0.9)" : "rgba(120,190,255,0.8)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pos[i][0], pos[i][1], r * 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(pos[i][0], pos[i][1], r * 0.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  },
});

function renderWebHud() {
  countTo($("#web-pairs"), pairs(n), { format: (v) => fmt(Math.round(v)) });
  const g = web.group;
  if (g) {
    $("#web-p").textContent = g.hasMatch ? "Match!" : "No match";
    $("#web-mode").textContent = g.hasMatch ? `${g.shared.length} shared birthday${g.shared.length > 1 ? "s" : ""} in this group` : `this time, in a group of ${n}`;
  } else {
    countTo($("#web-p"), pShared(n) * 100, { format: (v) => `${v.toFixed(1)}%` });
    $("#web-mode").textContent = "chance two share a birthday";
  }
  stage.setLabel(g ? `A sampled group of ${n} placed on a year dial. ${g.hasMatch ? "Some share a birthday." : "No shared birthdays."}` : `${n} people and all ${fmt(pairs(n))} pairs between them.`);
}

function webShow(group) {
  web.group = group;
  web.flareAt = performance.now() / 1000;
  renderWebHud();
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
  webShow(group);
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
    else renderWebHud();
  },
});
