// A tiny responsive SVG line chart. No dependencies; colours come from CSS variables
// so charts follow the light/dark theme automatically.

const NS = "http://www.w3.org/2000/svg";

export function svg(tag, attrs = {}, parent) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "text") el.textContent = v;
    else el.setAttribute(k, v);
  }
  parent?.append(el);
  return el;
}

/** "Nice" tick values between min and max (linear scale). */
export function niceTicks(min, max, count = 5) {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const err = raw / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

function logTicks(min, max) {
  const ticks = [];
  for (let e = Math.ceil(Math.log10(min)); e <= Math.floor(Math.log10(max)); e++) ticks.push(10 ** e);
  // Thin out when there are too many decades.
  const stride = Math.ceil(ticks.length / 6);
  return ticks.filter((_, i) => i % stride === 0);
}

/**
 * Create a line chart inside `container`.
 *
 * options:
 *   height, ariaLabel
 *   x / y: { domain: [min, max], label, format(v), type: "linear" | "log", ticks }
 *   series: [{ id, label, color, dashed, width, fill, dots }]
 *   legend: true to render an HTML legend above the chart
 *
 * Returns { set(id, points), setLines({ h, v }), setMarkers(markers), setDomain(axis, domain), redraw() }.
 * Points are [x, y] pairs. Markers are { x, y, color, label, r }.
 */
export function lineChart(container, options) {
  const opts = { height: 280, legend: true, ...options };
  const state = {
    x: { type: "linear", format: String, ...opts.x },
    y: { type: "linear", format: String, ...opts.y },
    data: Object.fromEntries(opts.series.map((s) => [s.id, []])),
    lines: { h: [], v: [] },
    markers: [],
  };

  if (opts.legend) {
    const legend = document.createElement("ul");
    legend.className = "legend";
    for (const s of opts.series.filter((s) => s.label)) {
      const li = document.createElement("li");
      const sw = document.createElement("span");
      sw.className = `swatch${s.dashed ? " is-dashed" : ""}${s.dots && !s.line ? " is-dot" : ""}`;
      sw.style.setProperty("--swatch", s.color);
      li.append(sw, s.label);
      legend.append(li);
    }
    container.append(legend);
  }

  const root = svg("svg", { class: "chart", role: "img", "aria-label": opts.ariaLabel ?? "Chart" }, container);
  let width = Math.max(280, Math.floor(container.clientWidth) || 600);
  const m = { top: 14, right: 18, bottom: 46, left: 58, ...opts.margin };

  const scale = (axis, v) => {
    const a = state[axis];
    const [d0, d1] = a.domain;
    const [r0, r1] = axis === "x" ? [m.left, width - m.right] : [opts.height - m.bottom, m.top];
    const t = a.type === "log" ? (Math.log10(v) - Math.log10(d0)) / (Math.log10(d1) - Math.log10(d0)) : (v - d0) / (d1 - d0);
    return r0 + t * (r1 - r0);
  };
  const sx = (v) => scale("x", v);
  const sy = (v) => scale("y", v);
  const invX = (px) => {
    const [d0, d1] = state.x.domain;
    const t = (px - m.left) / (width - m.right - m.left);
    return state.x.type === "log" ? 10 ** (Math.log10(d0) + t * (Math.log10(d1) - Math.log10(d0))) : d0 + t * (d1 - d0);
  };
  const uid = Math.random().toString(36).slice(2, 8);
  let hoverX = null;
  let hoverG = null;

  function redraw() {
    root.replaceChildren();
    root.setAttribute("viewBox", `0 0 ${width} ${opts.height}`);
    root.setAttribute("width", width);
    root.setAttribute("height", opts.height);

    const { x, y } = state;
    const xt = x.ticks ?? (x.type === "log" ? logTicks(...x.domain) : niceTicks(...x.domain, width < 420 ? 4 : 6));
    const yt = y.ticks ?? niceTicks(...y.domain, 5);
    const bottom = opts.height - m.bottom;

    const grid = svg("g", { class: "grid", "aria-hidden": "true" }, root);
    for (const t of yt) svg("line", { x1: m.left, x2: width - m.right, y1: sy(t), y2: sy(t) }, grid);
    for (const t of xt) svg("line", { x1: sx(t), x2: sx(t), y1: m.top, y2: bottom }, grid);

    const axis = svg("g", { class: "axis", "aria-hidden": "true" }, root);
    svg("line", { x1: m.left, x2: width - m.right, y1: bottom, y2: bottom }, axis);
    svg("line", { x1: m.left, x2: m.left, y1: m.top, y2: bottom }, axis);
    for (const t of yt) svg("text", { x: m.left - 8, y: sy(t) + 4, "text-anchor": "end", text: y.format(t) }, axis);
    for (const t of xt) svg("text", { x: sx(t), y: bottom + 18, "text-anchor": "middle", text: x.format(t) }, axis);
    if (x.label) svg("text", { class: "axis-label", x: (m.left + width - m.right) / 2, y: opts.height - 6, "text-anchor": "middle", text: x.label }, axis);
    if (y.label)
      svg("text", { class: "axis-label", x: -(m.top + bottom) / 2, y: 14, transform: "rotate(-90)", "text-anchor": "middle", text: y.label }, axis);

    const clipId = `clip-${uid}`;
    const defs = svg("defs", {}, root);
    const clip = svg("clipPath", { id: clipId }, defs);
    for (const s of opts.series.filter((s) => s.fill)) {
      const g = svg("linearGradient", { id: `fill-${uid}-${s.id}`, x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
      svg("stop", { offset: 0, style: { stopColor: s.color, stopOpacity: 0.32 } }, g);
      svg("stop", { offset: 1, style: { stopColor: s.color, stopOpacity: 0 } }, g);
    }
    svg("rect", { x: m.left, y: m.top - 2, width: width - m.left - m.right, height: bottom - m.top + 4 }, clip);
    const plot = svg("g", { "clip-path": `url(#${clipId})` }, root);

    for (const line of state.lines.h) {
      svg("line", { x1: m.left, x2: width - m.right, y1: sy(line.y), y2: sy(line.y), style: { stroke: line.color ?? "var(--muted)", strokeDasharray: "5 4", strokeWidth: 1.5 } }, plot);
      if (line.label)
        svg("text", { x: width - m.right - 4, y: sy(line.y) - 6, "text-anchor": "end", text: line.label, style: { fill: line.color ?? "var(--muted)", fontWeight: 600 } }, plot);
    }
    for (const line of state.lines.v) {
      svg("line", { x1: sx(line.x), x2: sx(line.x), y1: m.top, y2: bottom, style: { stroke: line.color ?? "var(--muted)", strokeDasharray: "5 4", strokeWidth: 1.5 } }, plot);
      if (line.label) svg("text", { x: sx(line.x) + 6, y: m.top + 12, text: line.label, style: { fill: line.color ?? "var(--muted)", fontWeight: 600 } }, plot);
    }

    for (const s of opts.series) {
      const pts = state.data[s.id];
      if (!pts?.length) continue;
      const d = pts.map(([px, py], i) => `${i ? "L" : "M"}${sx(px).toFixed(1)},${sy(py).toFixed(1)}`).join("");
      if (s.fill) {
        const base = sy(Math.max(state.y.domain[0], 0));
        const area = `${d}L${sx(pts.at(-1)[0]).toFixed(1)},${base}L${sx(pts[0][0]).toFixed(1)},${base}Z`;
        svg("path", { d: area, style: { fill: `url(#fill-${uid}-${s.id})`, stroke: "none" } }, plot);
      }
      if (s.line !== false && !s.dots)
        svg("path", { d, class: "series-line", style: { color: s.color, fill: "none", stroke: s.color, strokeWidth: s.width ?? 2.75, strokeDasharray: s.dashed ? "6 5" : "none", strokeLinejoin: "round", strokeLinecap: "round" } }, plot);
      if (s.dots) for (const [px, py] of pts) svg("circle", { cx: sx(px), cy: sy(py), r: s.r ?? 3.5, style: { fill: s.color } }, plot);
    }

    for (const mk of state.markers) {
      const cx = sx(mk.x);
      const cy = sy(mk.y);
      svg("circle", { cx, cy, r: (mk.r ?? 6) + 6, style: { fill: mk.color ?? "var(--ink)", opacity: 0.18 } }, root);
      svg("circle", { cx, cy, r: mk.r ?? 6, style: { fill: "var(--surface)", stroke: mk.color ?? "var(--ink)", strokeWidth: 3 } }, root);
      if (mk.label) {
        const right = cx < width - 140;
        svg("text", { x: cx + (right ? 14 : -14), y: cy - 12, "text-anchor": right ? "start" : "end", text: mk.label, style: { fill: mk.color ?? "var(--ink)", fontWeight: 700, fontSize: "13px" } }, root);
      }
    }
    hoverG = svg("g", { "aria-hidden": "true" }, root);
    drawHover();
  }

  // ---------- Hover read-out ----------

  const tip = document.createElement("div");
  tip.className = "chart-tip";
  tip.hidden = true;
  if (getComputedStyle(container).position === "static") container.style.position = "relative";
  container.append(tip);

  const nearest = (pts, x) => {
    let lo = 0;
    let hi = pts.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid][0] < x) lo = mid;
      else hi = mid;
    }
    return Math.abs(pts[lo][0] - x) <= Math.abs(pts[hi][0] - x) ? pts[lo] : pts[hi];
  };

  function drawHover() {
    if (!hoverG) return;
    hoverG.replaceChildren();
    const live = opts.series.filter((s) => s.label && state.data[s.id]?.length > 1 && s.hover !== false);
    if (hoverX == null || !live.length || opts.hover === false) {
      tip.hidden = true;
      return;
    }
    const rows = live.map((s) => ({ s, p: nearest(state.data[s.id], invX(hoverX)) }));
    const px = sx(rows[0].p[0]);
    svg("line", { class: "hover-line", x1: px, x2: px, y1: m.top, y2: opts.height - m.bottom }, hoverG);
    for (const { s, p } of rows) svg("circle", { cx: sx(p[0]), cy: sy(p[1]), r: 4.5, style: { fill: s.color, stroke: "var(--surface)", strokeWidth: 2 } }, hoverG);
    const fx = state.x.tipFormat ?? state.x.format;
    const fy = state.y.tipFormat ?? state.y.format;
    tip.innerHTML = `<div>${state.x.label ? `${state.x.label}: ` : ""}<b>${fx(rows[0].p[0])}</b></div>${rows.map(({ s, p }) => `<div><i style="--c:${s.color}"></i>${s.label}: <b>${fy(p[1])}</b></div>`).join("")}`;
    tip.hidden = false;
    const box = container.getBoundingClientRect();
    const svgBox = root.getBoundingClientRect();
    const scaleK = svgBox.width / width;
    const left = svgBox.left - box.left + px * scaleK;
    const tw = tip.offsetWidth;
    const x = left + 14 + tw > box.width ? left - tw - 14 : left + 14;
    tip.style.transform = `translate(${Math.max(4, x)}px, ${svgBox.top - box.top + m.top}px)`;
  }

  root.addEventListener("pointermove", (e) => {
    const r = root.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * width;
    hoverX = px >= m.left && px <= width - m.right ? px : null;
    drawHover();
  });
  root.addEventListener("pointerleave", () => {
    hoverX = null;
    drawHover();
  });

  const ro = new ResizeObserver((entries) => {
    const w = Math.floor(entries[0].contentRect.width);
    if (w > 0 && Math.abs(w - width) > 1) {
      width = Math.max(280, w);
      redraw();
    }
  });
  ro.observe(container);
  redraw();

  return {
    set(id, points) {
      state.data[id] = points;
      redraw();
    },
    setMany(map) {
      Object.assign(state.data, map);
      redraw();
    },
    setLines({ h = state.lines.h, v = state.lines.v } = {}) {
      state.lines = { h, v };
      redraw();
    },
    setMarkers(markers) {
      state.markers = markers;
      redraw();
    },
    setDomain(axisName, domain) {
      state[axisName].domain = domain;
      redraw();
    },
    /** Patch axis settings, e.g. setAxis("x", { label, format, domain }). */
    setAxis(axisName, patch) {
      Object.assign(state[axisName], patch);
      redraw();
    },
    setAriaLabel(text) {
      root.setAttribute("aria-label", text);
    },
    redraw,
  };
}
