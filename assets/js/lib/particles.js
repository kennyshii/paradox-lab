// A glowing particle field that morphs between shapes. Used by the home-page hero:
// each paradox gets a silhouette, and the particles fly from one to the next.

import { prefersReducedMotion } from "./sim.js";

const S = 320; // offscreen sampling canvas size

/** Sample up to `n` points (in -0.5..0.5 units) from whatever `draw(ctx, S)` paints. */
function sampleShape(draw, n) {
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = ctx.strokeStyle = "#fff";
  ctx.lineCap = ctx.lineJoin = "round";
  draw(ctx, S);
  const data = ctx.getImageData(0, 0, S, S).data;
  const pts = [];
  for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) if (data[(y * S + x) * 4 + 3] > 128) pts.push([x / S - 0.5, y / S - 0.5]);
  // shuffle, then take n (repeat if the shape is small)
  for (let i = pts.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return Array.from({ length: n }, (_, i) => pts[i % pts.length] ?? [0, 0]);
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/**
 * shapes: [{ draw(ctx, S), colors: ["#hex", "#hex"] }]
 * Returns { go(i), next(), destroy() }.
 */
export function particleMorph(canvas, { shapes, interval = 4200, onChange, pointerTarget = canvas }) {
  const ctx = canvas.getContext("2d");
  const reduced = prefersReducedMotion();
  let w = 0;
  let h = 0;
  let dpr = 1;
  let N = 0;
  let parts = [];
  let samples = [];
  let current = 0;
  let timer = 0;
  let raf = 0;
  let visible = true;
  const pointer = { x: -1e4, y: -1e4 };
  const BUCKETS = 10;
  let palette = [];

  function layout() {
    const mobile = w < 720;
    return {
      cx: mobile ? w * 0.5 : w * 0.7,
      cy: mobile ? h * 0.3 : h * 0.5,
      size: mobile ? Math.min(w * 0.82, h * 0.48) : Math.min(w * 0.42, h * 0.78),
    };
  }

  function setPalette(i) {
    const [a, b] = shapes[i].colors.map(hex);
    palette = Array.from({ length: BUCKETS }, (_, k) => `rgb(${mixRgb(a, b, k / (BUCKETS - 1)).join(",")})`);
  }

  function build() {
    const area = w * h;
    N = Math.round(Math.min(2600, Math.max(900, area / 420)));
    samples = shapes.map((s) => sampleShape(s.draw, N));
    const { cx, cy, size } = layout();
    parts = Array.from({ length: N }, (_, i) => {
      const dust = i % 9 === 0;
      const [tx, ty] = samples[current][i];
      return {
        x: reduced ? cx + tx * size : Math.random() * w,
        y: reduced ? cy + ty * size : Math.random() * h,
        vx: 0,
        vy: 0,
        dust,
        dx: Math.random(),
        dy: Math.random(),
        seed: Math.random() * Math.PI * 2,
        z: 0.5 + Math.random() * 0.9,
      };
    });
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(2, devicePixelRatio || 1);
    const first = !w;
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (first || !parts.length) build();
    frame(performance.now());
  }

  function frame(now) {
    const t = now / 1000;
    const { cx, cy, size } = layout();
    const target = samples[current];
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);

    // soft colour bloom behind the shape
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.85);
    g.addColorStop(0, palette[2].replace("rgb", "rgba").replace(")", ",0.20)"));
    g.addColorStop(0.6, palette[BUCKETS - 3].replace("rgb", "rgba").replace(")", ",0.06)"));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "lighter";
    const buckets = Array.from({ length: BUCKETS }, () => []);
    for (let i = 0; i < N; i++) {
      const p = parts[i];
      let X;
      let Y;
      if (p.dust) {
        X = (p.dx * w + Math.sin(t * 0.1 + p.seed) * 40) % w;
        Y = (p.dy * h + Math.cos(t * 0.13 + p.seed) * 40) % h;
      } else {
        const [tx, ty] = target[i];
        X = cx + tx * size + Math.sin(t * 1.3 + p.seed) * 1.6;
        Y = cy + ty * size + Math.cos(t * 1.1 + p.seed) * 1.6;
      }
      if (!reduced) {
        p.vx += (X - p.x) * 0.022 * p.z;
        p.vy += (Y - p.y) * 0.022 * p.z;
        const ddx = p.x - pointer.x;
        const ddy = p.y - pointer.y;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < 9000) {
          const f = (1 - d2 / 9000) * 2.4;
          const d = Math.sqrt(d2) || 1;
          p.vx += (ddx / d) * f;
          p.vy += (ddy / d) * f;
        }
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;
      } else {
        p.x = X;
        p.y = Y;
      }
      const k = p.dust ? (i * 7) % BUCKETS : Math.max(0, Math.min(BUCKETS - 1, Math.floor((target[i][0] + 0.5) * BUCKETS)));
      buckets[k].push(p);
    }
    for (let k = 0; k < BUCKETS; k++) {
      ctx.fillStyle = palette[k];
      for (const p of buckets[k]) {
        const s = p.dust ? 1 : 1.1 + p.z * 0.9;
        ctx.globalAlpha = p.dust ? 0.35 : 0.55 + 0.45 * Math.sin(t * 2 + p.seed) ** 2;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    frame(now);
    raf = requestAnimationFrame(loop);
  }
  const start = () => {
    if (!reduced && !raf) raf = requestAnimationFrame(loop);
  };

  function go(i) {
    current = (i + shapes.length) % shapes.length;
    setPalette(current);
    if (!reduced) {
      // a little outward kick so the particles swirl rather than slide
      for (const p of parts) {
        p.vx += (Math.random() - 0.5) * 14;
        p.vy += (Math.random() - 0.5) * 14;
      }
    } else frame(performance.now());
    onChange?.(current);
    clearTimeout(timer);
    if (!reduced) timer = setTimeout(() => go(current + 1), interval);
  }

  pointerTarget.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  });
  pointerTarget.addEventListener("pointerleave", () => {
    pointer.x = pointer.y = -1e4;
  });
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) start();
  }).observe(canvas);
  document.addEventListener("visibilitychange", start);

  setPalette(0);
  resize();
  go(0);
  start();
  return { go, next: () => go(current + 1) };
}

// ---------- Silhouettes for each paradox ----------

const font = (ctx, px) => (ctx.font = `800 ${px}px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, "Segoe UI", Roboto, sans-serif`);
const centerText = (ctx, S, lines, px) => {
  font(ctx, px);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((l, i) => ctx.fillText(l, S / 2, S / 2 + (i - (lines.length - 1) / 2) * px * 1.05));
};

export const SHAPES = {
  "rope-around-earth"(ctx, S) {
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = S * 0.022;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  },
  "monty-hall"(ctx, S) {
    ctx.lineWidth = S * 0.028;
    const dw = S * 0.22;
    const dh = S * 0.5;
    [-1, 0, 1].forEach((k) => {
      const x = S / 2 + k * dw * 1.3 - dw / 2;
      const y = S * 0.28;
      if (k === 0) ctx.strokeRect(x, y, dw, dh);
      else ctx.fillRect(x, y, dw, dh);
    });
    font(ctx, S * 0.2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", S / 2, S * 0.53);
  },
  "birthday-problem"(ctx, S) {
    centerText(ctx, S, ["23"], S * 0.62);
  },
  "simpsons-paradox"(ctx, S) {
    ctx.lineWidth = S * 0.03;
    [
      [0.12, 0.3, 0.32, 0.16],
      [0.4, 0.5, 0.6, 0.36],
      [0.68, 0.72, 0.88, 0.58],
    ].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1 * S, y1 * S);
      ctx.lineTo(x2 * S, y2 * S);
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc((x1 + ((x2 - x1) * i) / 4) * S, (y1 + ((y2 - y1) * i) / 4) * S + (i % 2 ? -1 : 1) * S * 0.03, S * 0.018, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.setLineDash([S * 0.04, S * 0.03]);
    ctx.lineWidth = S * 0.022;
    ctx.beginPath();
    ctx.moveTo(S * 0.1, S * 0.18);
    ctx.lineTo(S * 0.9, S * 0.82);
    ctx.stroke();
  },
  "banach-tarski"(ctx, S) {
    for (const x of [0.29, 0.71]) {
      ctx.beginPath();
      ctx.arc(S * x, S / 2, S * 0.19, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  "missing-square"(ctx, S) {
    const x0 = S * 0.08;
    const y0 = S * 0.72;
    const u = (S * 0.84) / 13;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + 13 * u, y0);
    ctx.lineTo(x0 + 13 * u, y0 - 5 * u);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(x0 + 10 * u, y0 - u, u, u);
    ctx.globalCompositeOperation = "source-over";
  },
  "all-horses-same-color"(ctx, S) {
    const dw = S * 0.07;
    const dh = S * 0.34;
    for (let i = 0; i < 6; i++) {
      ctx.save();
      const x = S * 0.12 + i * S * 0.14 + (i > 0 ? S * 0.06 : 0);
      ctx.translate(x + dw, S * 0.68);
      if (i === 0) ctx.rotate(0.55);
      ctx.fillRect(-dw, -dh, dw, dh);
      ctx.restore();
    }
  },
  "zeno-dichotomy"(ctx, S) {
    ctx.lineWidth = S * 0.018;
    let x = S * 0.1;
    let y = S * 0.18;
    let ww = S * 0.8;
    let hh = S * 0.64;
    for (let i = 0; i < 9; i++) {
      ctx.strokeRect(x, y, ww, hh);
      if (i % 2 === 0) {
        ww /= 2;
        x += ww;
      } else {
        hh /= 2;
        y += hh;
      }
    }
  },
  "liar-paradox"(ctx, S) {
    centerText(ctx, S, ["“This is", "false.”"], S * 0.2);
  },
  "russells-paradox"(ctx, S) {
    centerText(ctx, S, ["R ∈ R ?"], S * 0.24);
  },
};

export const TYPE_COLORS = {
  veridical: ["#13c38b", "#2997ff"],
  falsidical: ["#ffb340", "#ff375f"],
  antinomy: ["#a78bfa", "#ff4fa3"],
};
