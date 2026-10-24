import { mountPage } from "../../assets/js/page.js";
import { $, h, segmented } from "../../assets/js/lib/dom.js";
import { fmt, pct } from "../../assets/js/lib/format.js";
import { stageCanvas, cssVar } from "../../assets/js/lib/fx.js";
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

// ---------- Bubble stage: groups merge into the overall result ----------

const ARM = { a: "#2997ff", b: "#ff8a4c" };
const bubbleState = new Map();
let merged = false;
let mergeT = 0;
let mergeV = 0;

const ease = (cur, target, k = 0.14) => cur + (target - cur) * k;

const bubbles = stageCanvas($("#bubbles"), {
  aspect: 16 / 8,
  minHeight: 320,
  maxHeight: 460,
  animate: true,
  label: "Bubble chart of success rates by group.",
  draw(ctx, w, h, t) {
    const groups = active();
    if (!groups.length) return;
    mergeV = (mergeV + ((merged ? 1 : 0) - mergeT) * 0.07) * 0.8;
    mergeT += mergeV;
    const m = Math.max(0, Math.min(1, mergeT));

    const top = 52;
    const bottom = h - 46;
    const left = 52;
    const right = w - 16;
    const cols = groups.length + 1;
    const colW = (right - left) / (cols + 0.4);
    const colX = (i) => left + colW * (i + 0.5) + (i === groups.length ? colW * 0.4 : 0);
    const pa = pooled(groups, "a");
    const pb = pooled(groups, "b");
    const rates = [...groups.flatMap((g) => [rate(g.a), rate(g.b)]), rate(pa), rate(pb)];
    const lo = Math.max(0, Math.floor((Math.min(...rates) - 0.06) * 10) / 10);
    const hi = Math.min(1, Math.ceil((Math.max(...rates) + 0.06) * 10) / 10);
    const sy = (v) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
    const nMax = Math.max(pa[1], pb[1]);
    const rMax = Math.min(colW * 0.24, (bottom - top) * 0.2);
    const rad = (n) => Math.max(3, rMax * Math.sqrt(n / nMax));

    // grid
    ctx.font = "600 11px -apple-system, Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let v = lo; v <= hi + 1e-9; v += 0.1) {
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.moveTo(left, sy(v));
      ctx.lineTo(right, sy(v));
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillText(pct(v, 0), left - 8, sy(v));
    }
    // divider before the combined column
    const dx = (colX(groups.length - 1) + colX(groups.length)) / 2;
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.moveTo(dx, top - 30);
    ctx.lineTo(dx, bottom + 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // column titles
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const titleOf = (g) => g.name.replace("Department ", "Dept ");
    groups.forEach((g, i) => {
      ctx.fillStyle = `rgba(255,255,255,${0.75 - m * 0.45})`;
      ctx.font = "600 12px -apple-system, Inter, sans-serif";
      ctx.fillText(titleOf(g), colX(i), h - 22);
    });
    ctx.fillStyle = `rgba(255,255,255,${0.5 + m * 0.5})`;
    ctx.font = "700 12px -apple-system, Inter, sans-serif";
    ctx.fillText("All combined", colX(groups.length), h - 22);

    // group bubbles fly to the combined column as they merge
    const drawn = [];
    groups.forEach((g, i) => {
      for (const arm of ["a", "b"]) {
        const off = (arm === "a" ? -1 : 1) * colW * 0.17;
        const gx = colX(i) + off;
        const gy = sy(rate(g[arm]));
        const cx = colX(groups.length) + off;
        const cy = sy(rate(arm === "a" ? pa : pb));
        const tx = gx + (cx - gx) * m;
        const ty = gy + (cy - gy) * m;
        const key = `${g.name}:${arm}`;
        const st = bubbleState.get(key) ?? { x: tx, y: bottom, r: 0 };
        st.x = ease(st.x, tx, 0.2);
        st.y = ease(st.y, ty, 0.2);
        st.r = ease(st.r, rad(g[arm][1]) * (1 - m * 0.6), 0.16);
        bubbleState.set(key, st);
        drawn.push({ ...st, arm, i, alpha: 1 - m * 0.75 });
      }
    });
    // within-group comparison lines (fade out while merging)
    groups.forEach((g, i) => {
      const A = drawn.find((d) => d.i === i && d.arm === "a");
      const B = drawn.find((d) => d.i === i && d.arm === "b");
      const aWins = rate(g.a) > rate(g.b);
      ctx.strokeStyle = aWins ? `rgba(41,151,255,${0.6 * (1 - m)})` : `rgba(255,138,76,${0.6 * (1 - m)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
      if (m < 0.5) {
        ctx.globalAlpha = 1 - m * 2;
        ctx.fillStyle = aWins ? ARM.a : ARM.b;
        ctx.font = "700 11px -apple-system, Inter, sans-serif";
        ctx.fillText(aWins ? "A ahead" : "B ahead", colX(i), top - 20);
        ctx.globalAlpha = 1;
      }
    });
    for (const d of drawn) {
      ctx.globalAlpha = d.alpha;
      const g = ctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.35, d.r * 0.1, d.x, d.y, d.r);
      g.addColorStop(0, "#fff");
      g.addColorStop(0.25, ARM[d.arm]);
      g.addColorStop(1, ARM[d.arm] + "99");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(d.x, d.y, Math.max(0, d.r), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // combined bubbles: ghost outlines until the merge lands
    for (const arm of ["a", "b"]) {
      const p = arm === "a" ? pa : pb;
      const x = colX(groups.length) + (arm === "a" ? -1 : 1) * colW * 0.17;
      const y = sy(rate(p));
      const r = rad(p[1]);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = `rgba(255,255,255,${0.35 * (1 - m)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (m > 0.02) {
        ctx.globalAlpha = m;
        ctx.shadowColor = ARM[arm];
        ctx.shadowBlur = 30 * m;
        const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
        g.addColorStop(0, "#fff");
        g.addColorStop(0.2, ARM[arm]);
        g.addColorStop(1, ARM[arm] + "aa");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * (0.6 + 0.4 * m), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "700 13px -apple-system, Inter, sans-serif";
        ctx.fillText(pct(rate(p), 0), x, y - r - 8);
        ctx.globalAlpha = 1;
      }
    }
    if (m > 0.6) {
      const aWins = rate(pa) > rate(pb);
      ctx.globalAlpha = (m - 0.6) / 0.4;
      ctx.fillStyle = aWins ? ARM.a : ARM.b;
      ctx.font = "800 13px -apple-system, Inter, sans-serif";
      ctx.fillText(aWins ? "A ahead overall" : "B ahead overall", colX(groups.length), top - 20);
      ctx.globalAlpha = 1;
    }
  },
});

$("#merge").addEventListener("click", (e) => {
  merged = !merged;
  e.currentTarget.setAttribute("aria-pressed", String(merged));
  e.currentTarget.textContent = merged ? "Split by group" : "Merge the groups";
});

function render() {
  const groups = active();
  bubbles.setLabel(groups.length ? `Success rates for ${groups.map((g) => g.name).join(", ")}, ${merged ? "merged into overall rates" : "shown group by group"}.` : "No groups selected.");
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
