import { mountPage } from "../../assets/js/page.js";
import { $, h, segmented } from "../../assets/js/lib/dom.js";
import { FACTS, PRESETS, truthTable, verdict, revise, claimsUnder } from "./model.js";
import { stageCanvas } from "../../assets/js/lib/fx.js";
import { prefersReducedMotion } from "../../assets/js/lib/sim.js";

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
              oscReset();
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

// ---------- Truth oscillator ----------

const T_COL = [50, 213, 131];
const F_COL = [255, 90, 100];
let osc = { history: [], round: 0, last: 0, glow: [] };

function oscReset() {
  // Pre-roll a dozen rounds so the traces are full from the start.
  const history = revise(sentences, sentences.map((_, i) => start[i] ?? true), 12);
  osc = { history, round: 12, last: performance.now(), glow: sentences.map(() => 0) };
  const r = $("#osc-round");
  if (r) r.textContent = "12";
}

function oscStep() {
  const next = claimsUnder(sentences, osc.history.at(-1));
  next.forEach((v, i) => {
    if (v !== osc.history.at(-1)[i]) osc.glow[i] = 1;
  });
  osc.history.push(next);
  if (osc.history.length > 40) osc.history.shift();
  osc.round++;
  const settled = osc.history.length > 1 && next.every((v, i) => v === osc.history.at(-2)[i]);
  $("#osc-round").textContent = String(osc.round);
  $("#osc-note").textContent = settled ? "Settled: a fixed point" : "Still flipping…";
}

oscReset();

const mixCol = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

const oscStage = stageCanvas($("#osc"), {
  aspect: 16 / 8,
  minHeight: 300,
  maxHeight: 420,
  animate: true,
  label: "Sentences flipping between true and false over revision rounds.",
  draw(ctx, w, h, t) {
    const now = performance.now();
    if (!prefersReducedMotion() && now - osc.last > 1100) {
      osc.last = now;
      oscStep();
    }
    const n = sentences.length;
    const cur = osc.history.at(-1);
    const graphH = h * 0.56;
    const cy = graphH / 2 + 18;
    const R = Math.min(graphH * 0.32, w * 0.16);
    const nodeR = Math.min(44, R * 0.6 + 14);
    const facts = [...new Set(sentences.map((s) => s.target).filter((x) => typeof x === "string"))];
    const posOf = (i) => (n === 1 ? [w / 2 - (facts.length ? R : 0), cy] : [w / 2 + Math.cos(-Math.PI / 2 + (i * Math.PI * 2) / n) * R, cy + Math.sin(-Math.PI / 2 + (i * Math.PI * 2) / n) * R]);
    const factPos = (id) => [w / 2 + R * 2.1, cy - 20 + facts.indexOf(id) * 50];

    // arrows
    ctx.lineWidth = 2;
    sentences.forEach((s, i) => {
      const [x, y] = posOf(i);
      const flow = (t * 0.8) % 1;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      if (s.target === i) {
        // self-loop above the node, with a dot travelling around it
        const lr = nodeR * 0.8;
        const lx = x;
        const ly = y - nodeR - lr * 0.6;
        ctx.beginPath();
        ctx.arc(lx, ly, lr, Math.PI * 0.75, Math.PI * 2.25);
        ctx.stroke();
        const a = Math.PI * 0.75 + flow * Math.PI * 1.5;
        ctx.beginPath();
        ctx.arc(lx + Math.cos(a) * lr, ly + Math.sin(a) * lr, 3.5, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      const [tx, ty] = typeof s.target === "number" ? posOf(s.target) : factPos(s.target);
      const d = Math.hypot(tx - x, ty - y) || 1;
      const ux = (tx - x) / d;
      const uy = (ty - y) / d;
      const bend = typeof s.target === "number" ? 18 : 0;
      const sx = x + ux * nodeR;
      const sy = y + uy * nodeR;
      const ex = tx - ux * (nodeR + 6);
      const ey = ty - uy * (nodeR + 6);
      const mx = (sx + ex) / 2 - uy * bend;
      const my = (sy + ey) / 2 + ux * bend;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
      const q = (u) => [(1 - u) ** 2 * sx + 2 * (1 - u) * u * mx + u * u * ex, (1 - u) ** 2 * sy + 2 * (1 - u) * u * my + u * u * ey];
      const [px, py] = q(flow);
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
      const [ax, ay] = q(0.97);
      const ang = Math.atan2(ey - ay, ex - ax);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - Math.cos(ang - 0.45) * 10, ey - Math.sin(ang - 0.45) * 10);
      ctx.lineTo(ex - Math.cos(ang + 0.45) * 10, ey - Math.sin(ang + 0.45) * 10);
      ctx.fill();
    });

    // fact nodes
    ctx.font = "600 12px -apple-system, Inter, sans-serif";
    ctx.textBaseline = "middle";
    for (const id of facts) {
      const [x, y] = factPos(id);
      ctx.fillStyle = FACTS[id].value ? "rgba(50,213,131,0.18)" : "rgba(255,90,100,0.18)";
      ctx.beginPath();
      ctx.roundRect(x - 6, y - 15, 118, 30, 15);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.fillText(FACTS[id].label, x + 6, y);
    }

    // sentence nodes
    sentences.forEach((s, i) => {
      const [x, y] = posOf(i);
      osc.glow[i] = Math.max(0, (osc.glow[i] ?? 0) - 0.03);
      const col = cur[i] ? T_COL : F_COL;
      const c = mixCol(col, [255, 255, 255], osc.glow[i] * 0.6);
      const halo = ctx.createRadialGradient(x, y, nodeR * 0.6, x, y, nodeR * (2 + osc.glow[i]));
      halo.addColorStop(0, `rgba(${col.join(",")},0.55)`);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, nodeR * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgb(${c.join(",")})`;
      ctx.beginPath();
      ctx.arc(x, y, nodeR * (1 + osc.glow[i] * 0.15), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.textAlign = "center";
      ctx.font = `800 ${Math.round(nodeR * 0.62)}px -apple-system, Inter, sans-serif`;
      ctx.fillText(cur[i] ? "T" : "F", x, y + 1);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "700 12px -apple-system, Inter, sans-serif";
      ctx.fillText(name(i), x, y + nodeR + 14);
    });

    // waveform traces
    const top = graphH + 26;
    const rowH = Math.min(30, (h - top - 70) / n);
    const left = 54;
    const right = w - 20;
    const cols = 24;
    const stepW = (right - left) / cols;
    const hist = osc.history.slice(-cols);
    const slide = prefersReducedMotion() ? 0 : Math.min(1, (now - osc.last) / 300);
    sentences.forEach((_, i) => {
      const y0 = top + i * (rowH + 8);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.textAlign = "left";
      ctx.font = "700 11px -apple-system, Inter, sans-serif";
      ctx.fillText(name(i), 16, y0 + rowH / 2);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      hist.forEach((row, k) => {
        const x = right - (hist.length - k - 1 + (1 - slide)) * stepW;
        const y = row[i] ? y0 + 2 : y0 + rowH - 2;
        if (k === 0) ctx.moveTo(Math.max(left, x - stepW), y);
        else ctx.lineTo(x - stepW, y);
        ctx.lineTo(x, y);
      });
      const g = ctx.createLinearGradient(left, 0, right, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.3, "rgba(160,200,255,0.6)");
      g.addColorStop(1, "#fff");
      ctx.strokeStyle = g;
      ctx.stroke();
    });
  },
});

function render() {
  oscReset();
  renderEditor();
  renderTable();
  renderRevision();
}

render();
