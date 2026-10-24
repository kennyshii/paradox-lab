// Small motion helpers: morphing DOM updates, confetti, counting numbers and
// a canvas that tracks its element's size. All of them respect reduced motion.

import { prefersReducedMotion } from "./sim.js";

/**
 * Run `update` inside a same-document view transition when the browser supports it,
 * so the old and new DOM morph into each other. Falls back to a plain update.
 */
export function morph(update) {
  if (!document.startViewTransition || prefersReducedMotion()) {
    update();
    return Promise.resolve();
  }
  return document.startViewTransition(update).finished.catch(() => {});
}

/** Burst of confetti from a point (defaults to the centre of `el`). */
export function confetti(el, { count = 90, colors = ["#2997ff", "#a259ff", "#ff4f8b", "#ff9f0a", "#32d583"] } = {}) {
  if (prefersReducedMotion()) return;
  const r = el?.getBoundingClientRect?.() ?? { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const ox = r.left + r.width / 2;
  const oy = r.top + r.height / 3;
  const canvas = document.createElement("canvas");
  canvas.className = "fx-layer";
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const bits = Array.from({ length: count }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const v = 7 + Math.random() * 9;
    return { x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 6, h: 3 + Math.random() * 5, c: colors[(Math.random() * colors.length) | 0], life: 1 };
  });
  const tick = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = 0;
    for (const b of bits) {
      b.vy += 0.32;
      b.vx *= 0.985;
      b.x += b.vx;
      b.y += b.vy;
      b.rot += b.vr;
      b.life -= 0.009;
      if (b.life <= 0 || b.y > innerHeight + 20) continue;
      alive++;
      ctx.save();
      ctx.globalAlpha = Math.min(1, b.life * 2);
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.scale(1, Math.cos(b.rot * 2));
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    if (alive) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}

/** Animate the text of `el` from its current number to `to`, formatted by `format`. */
export function countTo(el, to, { format = (v) => String(Math.round(v)), duration = 700 } = {}) {
  const from = Number(el.dataset.value ?? 0);
  el.dataset.value = to;
  if (prefersReducedMotion() || from === to) {
    el.textContent = format(to);
    return;
  }
  const start = performance.now();
  cancelAnimationFrame(el._countRaf);
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const e = 1 - (1 - t) ** 4;
    el.textContent = format(from + (to - from) * e);
    if (t < 1) el._countRaf = requestAnimationFrame(step);
  };
  el._countRaf = requestAnimationFrame(step);
}

/**
 * A HiDPI canvas filling `box`'s width at a given aspect ratio (or fixed height).
 * `draw(ctx, w, h, t)` is called every frame while the canvas is on screen when `animate`
 * is true, or on demand via the returned `render()` otherwise.
 */
export function stageCanvas(box, { aspect = 16 / 9, height, minHeight = 220, maxHeight = 640, animate = false, draw, label }) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  if (label) canvas.setAttribute("aria-label", label);
  box.prepend(canvas);
  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let visible = true;
  let raf = 0;
  const t0 = performance.now();

  const resize = () => {
    const cw = box.clientWidth || 600;
    const ch = height ?? Math.max(minHeight, Math.min(maxHeight, cw / aspect));
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (cw === w && ch === h) return;
    w = cw;
    h = ch;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  };

  function render() {
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h, (performance.now() - t0) / 1000);
  }

  const loop = () => {
    raf = 0;
    if (!visible || document.hidden) return;
    render();
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (animate && !raf && !prefersReducedMotion()) raf = requestAnimationFrame(loop);
  };

  new ResizeObserver(resize).observe(box);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) start();
  }).observe(canvas);
  document.addEventListener("visibilitychange", start);
  document.addEventListener("themechange", render);
  resize();
  start();
  return { canvas, ctx, render, size: () => ({ w, h }), setLabel: (t) => canvas.setAttribute("aria-label", t) };
}

/** Read a CSS custom property (resolved) from an element, e.g. cssVar("--chart-1"). */
export function cssVar(name, el = document.documentElement) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/** Linear interpolation and a critically-damped spring step, for hand-rolled animations. */
export const lerp = (a, b, t) => a + (b - a) * t;

export function springStep(s, target, dt, { stiffness = 170, damping = 22 } = {}) {
  const f = -stiffness * (s.x - target) - damping * s.v;
  s.v += f * dt;
  s.x += s.v * dt;
  return s.x;
}
