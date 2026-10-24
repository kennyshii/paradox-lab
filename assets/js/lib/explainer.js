// A tiny "video" player for animated explainers: canvas scenes with captions,
// play/pause, a scrubber with chapter marks, keyboard control and a transcript.
//
// Usage:
//   explainer(element, { title, scenes: [{ caption, duration, draw(ctx, w, h, f) }] })
// where f = { p, t, k, u } — p: 0..1 progress through this scene, t: seconds since
// the page loaded (for idle motion), k: scene index, u: a size unit (1% of a 16:9 frame).

import { h } from "./dom.js";
import { stageCanvas } from "./fx.js";
import { prefersReducedMotion } from "./sim.js";

const PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>`;
const PAUSE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>`;
const REPLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" fill="currentColor"/></svg>`;

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function explainer(box, { title = "Explainer", scenes }) {
  const starts = [];
  let total = 0;
  for (const s of scenes) {
    starts.push(total);
    total += s.duration ?? 5;
  }
  let time = 0;
  let playing = false;
  let last = 0;
  let started = false;
  let shownK = -1;

  const caption = h("p", { class: "ex-caption", "aria-live": "polite" });
  const bigPlay = h("button", { type: "button", class: "ex-big-play", "aria-label": `Play: ${title}`, html: `${PLAY}<span>Watch the explainer</span>` });
  const stageBox = h("div", { class: "stage ex-stage" }, caption, bigPlay);
  const playBtn = h("button", { type: "button", class: "ex-btn", "aria-label": "Play", html: PLAY });
  const scrub = h("input", { type: "range", class: "ex-scrub", min: 0, max: Math.round(total * 10), step: 1, value: 0, "aria-label": "Seek" });
  const marks = h("div", { class: "ex-marks", "aria-hidden": "true" }, ...starts.slice(1).map((s) => h("span", { style: { left: `${(s / total) * 100}%` } })));
  const clock = h("span", { class: "ex-time" }, `0:00 / ${mmss(total)}`);
  const ccBtn = h("button", { type: "button", class: "ex-btn ex-cc", "aria-pressed": "true", "aria-label": "Captions" }, "CC");
  const transcript = h(
    "details",
    { class: "ex-transcript" },
    h("summary", {}, "Read the transcript"),
    h(
      "ol",
      {},
      ...scenes.map((s, k) => h("li", {}, h("button", { type: "button", on: { click: () => seekScene(k, true) } }, s.caption))),
    ),
  );
  box.classList.add("explainer");
  box.replaceChildren(stageBox, h("div", { class: "ex-controls" }, playBtn, h("div", { class: "ex-track" }, marks, scrub), clock, ccBtn), transcript);

  const sceneAt = (t) => {
    let k = 0;
    while (k < scenes.length - 1 && t >= starts[k + 1]) k++;
    return k;
  };

  let stage = null;
  stage = stageCanvas(stageBox, {
    aspect: 16 / 9,
    minHeight: 240,
    maxHeight: 620,
    animate: true,
    label: title,
    draw(ctx, w, hh, t) {
      const now = performance.now();
      if (playing) {
        time = Math.min(total, time + Math.min(0.1, (now - last) / 1000));
        if (time >= total) pause(true);
      }
      last = now;
      const k = sceneAt(time);
      const s = scenes[k];
      const p = Math.min(1, (time - starts[k]) / (s.duration ?? 5));
      const u = Math.min(w, (hh * 16) / 9) / 100;
      ctx.save();
      s.draw(ctx, w, hh, { p, t, k, u });
      ctx.restore();
      if (k !== shownK && stage) showCaption(k);
      if (playing) syncUi();
    },
  });

  function showCaption(k) {
    shownK = k;
    caption.classList.remove("is-in");
    void caption.offsetWidth;
    caption.textContent = scenes[k].caption;
    caption.classList.add("is-in");
    stage.setLabel(`${title}. Scene ${k + 1} of ${scenes.length}: ${scenes[k].caption}`);
    transcript.querySelectorAll("li").forEach((li, i) => li.classList.toggle("is-current", i === k));
  }

  function syncUi() {
    scrub.value = Math.round(time * 10);
    scrub.style.setProperty("--fill", `${(time / total) * 100}%`);
    clock.textContent = `${mmss(time)} / ${mmss(total)}`;
  }

  function play() {
    if (time >= total) time = 0;
    started = true;
    playing = true;
    last = performance.now();
    stageBox.classList.add("is-started");
    playBtn.innerHTML = PAUSE;
    playBtn.setAttribute("aria-label", "Pause");
    stage.render();
  }

  function pause(ended = false) {
    playing = false;
    playBtn.innerHTML = ended ? REPLAY : PLAY;
    playBtn.setAttribute("aria-label", ended ? "Replay" : "Play");
    syncUi();
  }

  function seekScene(k, andPlay = false) {
    time = starts[Math.max(0, Math.min(scenes.length - 1, k))] + 0.001;
    stageBox.classList.add("is-started");
    syncUi();
    stage.render();
    if (andPlay && !prefersReducedMotion()) play();
  }

  bigPlay.addEventListener("click", play);
  playBtn.addEventListener("click", () => (playing ? pause() : play()));
  scrub.addEventListener("input", () => {
    time = Number(scrub.value) / 10;
    stageBox.classList.add("is-started");
    syncUi();
    stage.render();
  });
  ccBtn.addEventListener("click", () => {
    const on = ccBtn.getAttribute("aria-pressed") !== "true";
    ccBtn.setAttribute("aria-pressed", String(on));
    stageBox.classList.toggle("no-captions", !on);
  });
  box.addEventListener("keydown", (e) => {
    if (e.target.closest("summary, .ex-transcript button")) return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      playing ? pause() : play();
    } else if (e.key === "ArrowRight" && e.target !== scrub) seekScene(sceneAt(time) + 1, playing);
    else if (e.key === "ArrowLeft" && e.target !== scrub) seekScene(sceneAt(time) - (time - starts[sceneAt(time)] < 1 ? 1 : 0), playing);
  });

  // Start on its own the first time it is mostly on screen (never with reduced motion),
  // and pause whenever it scrolls away.
  new IntersectionObserver(
    ([e]) => {
      if (e.intersectionRatio >= 0.6 && !started && !prefersReducedMotion()) play();
      else if (e.intersectionRatio < 0.2 && playing) pause();
    },
    { threshold: [0, 0.2, 0.6] },
  ).observe(stageBox);

  syncUi();
  return { play, pause, seekScene };
}

// ---------- Drawing kit shared by every explainer ----------

export const C = {
  white: "#f5f5f7",
  dim: "rgba(245,245,247,0.55)",
  faint: "rgba(245,245,247,0.14)",
  blue: "#2997ff",
  green: "#32d583",
  orange: "#ff9f0a",
  red: "#ff5a64",
  purple: "#bf5af2",
  pink: "#ff4fa3",
  yellow: "#ffd60a",
  teal: "#40c8e0",
};

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** Progress of a sub-step that runs from a to b inside a scene (both 0..1). */
export const seg = (p, a, b) => clamp((p - a) / (b - a));
export const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const easeOut = (x) => 1 - (1 - x) ** 3;
export const back = (x) => 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2;
export const lerp = (a, b, t) => a + (b - a) * t;

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, "Segoe UI", Roboto, sans-serif';

export function text(ctx, s, x, y, { size = 24, weight = 700, color = C.white, align = "center", alpha = 1, baseline = "middle" } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(s, x, y);
  ctx.restore();
}

export function rrect(ctx, x, y, w, h, r, { fill, stroke, lineWidth = 2, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

export function circle(ctx, x, y, r, { fill, stroke, lineWidth = 2, alpha = 1, glow = 0 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (glow) {
    ctx.shadowColor = fill ?? stroke;
    ctx.shadowBlur = glow;
  }
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

export function arrow(ctx, x1, y1, x2, y2, { color = C.white, width = 3, alpha = 1, head = 12, bend = 0 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend;
  const my = (y1 + y2) / 2 + (x2 - x1) * bend;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx, my, x2, y2);
  ctx.stroke();
  const a = Math.atan2(y2 - my, x2 - mx);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.45) * head, y2 - Math.sin(a - 0.45) * head);
  ctx.lineTo(x2 - Math.cos(a + 0.45) * head, y2 - Math.sin(a + 0.45) * head);
  ctx.fill();
  ctx.restore();
}

/** Large headline in the upper part of the frame (captions live at the bottom). */
export function title(ctx, w, u, s, { y = 11, alpha = 1, color = C.white, size = 5.2 } = {}) {
  text(ctx, s, w / 2, y * u, { size: size * u, weight: 800, alpha, color });
}

/** A simple glowing person (head + body), standing with feet at (x, y). */
export function person(ctx, x, y, u, color, { alpha = 1, scale = 1 } = {}) {
  const s = u * scale;
  circle(ctx, x, y - 3.9 * s, 1.5 * s, { fill: color, alpha, glow: 14 });
  rrect(ctx, x - 1.8 * s, y - 2.2 * s, 3.6 * s, 2.9 * s, [1.4 * s, 1.4 * s, 0.4 * s, 0.4 * s], { fill: color, alpha });
}

/** A labelled pill, e.g. a probability tag. */
export function tag(ctx, s, x, y, u, { color = C.white, bg = "rgba(255,255,255,0.12)", size = 2.6, alpha = 1 } = {}) {
  ctx.save();
  ctx.font = `800 ${size * u}px ${FONT}`;
  const w = ctx.measureText(s).width + size * u * 1.2;
  ctx.restore();
  rrect(ctx, x - w / 2, y - size * u * 0.9, w, size * u * 1.8, size * u * 0.9, { fill: bg, alpha });
  text(ctx, s, x, y + 0.05 * u, { size: size * u, weight: 800, color, alpha });
}
