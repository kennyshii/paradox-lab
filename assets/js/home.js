import { PARADOXES, TYPES } from "../../paradoxes/registry.js";
import { mountPage, badge, paradoxUrl, assetUrl } from "./page.js";
import { $, h, segmented } from "./lib/dom.js";

mountPage();

const grid = $("[data-grid]");
const count = $("[data-count]");

const cards = PARADOXES.map((p) => {
  const li = h(
    "li",
    { dataset: { type: p.type } },
    h(
      "article",
      { class: "card paradox-card", "data-type": p.type },
      h("img", { src: assetUrl(`paradoxes/${p.slug}/thumb.svg`), alt: "", width: 320, height: 180, loading: "lazy" }),
      h(
        "div",
        { class: "card-body" },
        badge(p.type),
        h("h3", {}, h("a", { href: paradoxUrl(p.slug) }, p.title)),
        h("p", {}, p.teaser),
        h("span", { class: "card-foot", "aria-hidden": "true" }, "Open the lab →"),
      ),
    ),
  );
  grid.append(li);
  return li;
});

function applyFilter(type) {
  let shown = 0;
  for (const li of cards) {
    const visible = type === "all" || li.dataset.type === type;
    li.hidden = !visible;
    if (visible) shown++;
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
    applyFilter(type);
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
  applyFilter(t);
});
