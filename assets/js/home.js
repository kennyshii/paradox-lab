import { PARADOXES, TYPES } from "../../paradoxes/registry.js";
import { mountPage, badge, paradoxUrl, thumbUrl, artName, titleName, tagForMorph, visited, observeReveals } from "./page.js";
import { $, $$, h, segmented } from "./lib/dom.js";
import { morph } from "./lib/fx.js";
import { particleMorph, SHAPES, TYPE_COLORS } from "./lib/particles.js";
import { prefersReducedMotion } from "./lib/sim.js";

mountPage();

// ---------- Hero: particles morph through every paradox ----------

const now = $("[data-hero-now]");
const dots = $("[data-now-dots]");
dots.replaceChildren(...PARADOXES.map(() => h("span")));

particleMorph($("[data-hero-canvas]"), {
  pointerTarget: $(".hero-stage"),
  shapes: PARADOXES.map((p) => ({
    draw: SHAPES[p.slug] ?? ((ctx, S) => ctx.fillRect(S * 0.3, S * 0.3, S * 0.4, S * 0.4)),
    colors: TYPE_COLORS[p.type],
  })),
  onChange(i) {
    const p = PARADOXES[i];
    now.classList.add("is-swapping");
    setTimeout(() => {
      $("[data-now-title]", now).textContent = p.title;
      const b = $("[data-now-badge]", now);
      b.dataset.type = p.type;
      b.textContent = TYPES[p.type].label;
      now.href = paradoxUrl(p.slug);
      now.setAttribute("aria-label", `Open the ${p.title} lab`);
      $$("span", dots).forEach((d, k) => d.classList.toggle("is-on", k === i));
      now.classList.remove("is-swapping");
    }, 280);
  },
});

for (const [type] of Object.entries(TYPES)) {
  const n = PARADOXES.filter((p) => p.type === type).length;
  const el = $(`[data-type-count="${type}"]`);
  if (el) el.textContent = `${n} lab${n === 1 ? "" : "s"} →`;
}

// ---------- Card grid ----------

const grid = $("[data-grid]");
const count = $("[data-count]");
const seen = visited();

const cards = PARADOXES.map((p, i) => {
  const thumb = h("div", { class: "thumb" }, h("img", { src: thumbUrl(p.slug), alt: "", width: 640, height: 360, loading: i < 3 ? "eager" : "lazy" }));
  const title = h("h3", {}, h("a", { href: paradoxUrl(p.slug) }, p.title));
  const card = h(
    "article",
    { class: "card paradox-card", "data-type": p.type },
    thumb,
    h(
      "div",
      { class: "card-body" },
      h("div", { class: "card-top" }, badge(p.type), seen.has(p.slug) ? h("span", { class: "visited-chip" }, "Explored") : null),
      title,
      h("p", {}, p.teaser),
      h("span", { class: "card-foot", "aria-hidden": "true" }, "Open the lab ", h("span", { class: "arrow" }, "→")),
    ),
  );
  tagForMorph($("a", title), p.slug, { art: thumb, title });
  tilt(card);
  const li = h("li", { class: "reveal", dataset: { type: p.type, slug: p.slug }, style: { "--reveal-delay": `${(i % 3) * 90}ms` } }, card);
  // Stable per-card names let the filter morph cards into their new places.
  li.style.viewTransitionName = `card-${p.slug}`;
  grid.append(li);
  return li;
});
observeReveals(grid);

// 3D tilt with a glare that follows the pointer.
function tilt(card) {
  if (prefersReducedMotion() || !matchMedia("(hover: hover)").matches) return;
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    card.classList.add("is-tilting");
    card.style.setProperty("--ry", `${(x - 0.5) * 8}deg`);
    card.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
    card.style.setProperty("--mx", `${x * 100}%`);
    card.style.setProperty("--my", `${y * 100}%`);
  });
  card.addEventListener("pointerleave", () => {
    card.classList.remove("is-tilting");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  });
}

// Progress: how many labs this visitor has opened.
const done = PARADOXES.filter((p) => seen.has(p.slug)).length;
$("[data-progress-text]").textContent = done ? `${done} of ${PARADOXES.length} explored` : `${PARADOXES.length} labs to explore`;
requestAnimationFrame(() => $(".progress-ring").style.setProperty("--p", String((done / PARADOXES.length) * 100)));

function applyFilter(type) {
  let shown = 0;
  for (const li of cards) {
    const show = type === "all" || li.dataset.type === type;
    li.hidden = !show;
    if (show) {
      shown++;
      li.classList.add("is-in");
    }
  }
  count.textContent =
    type === "all" ? `Showing all ${shown} paradoxes.` : `Showing ${shown} ${TYPES[type].label.toLowerCase()} paradox${shown === 1 ? "" : "es"}: ${TYPES[type].tagline.toLowerCase()}`;
}

const fromHash = () => {
  const t = location.hash.slice(1);
  return t in TYPES ? t : "all";
};

const filter = segmented($("[data-filter]"), {
  onChange(type) {
    morph(() => applyFilter(type));
    history.replaceState(null, "", type === "all" ? "#paradoxes" : `#${type}`);
  },
});

const initial = fromHash();
filter.set(initial, { silent: true });
applyFilter(initial);
if (initial !== "all") $("#paradoxes").scrollIntoView();

window.addEventListener("hashchange", () => {
  const t = fromHash();
  filter.set(t, { silent: true });
  morph(() => applyFilter(t));
  if (t !== "all") $("#paradoxes").scrollIntoView({ behavior: "smooth" });
});

// Coming back from a lab: tag that card so the lab's hero morphs back into it.
window.addEventListener("pagereveal", (e) => {
  const from = window.navigation?.activation?.from?.url;
  if (!e.viewTransition || !from) return;
  const li = cards.find((c) => from.includes(`/paradoxes/${c.dataset.slug}/`));
  if (!li) return;
  const art = $(".thumb", li);
  const title = $("h3", li);
  art.style.viewTransitionName = artName(li.dataset.slug);
  title.style.viewTransitionName = titleName(li.dataset.slug);
  li.classList.add("is-in");
  e.viewTransition.finished.finally(() => {
    art.style.viewTransitionName = "";
    title.style.viewTransitionName = "";
  });
});
