// Shared page shell: header, footer, theme toggle, paradox hero, guess widget,
// KaTeX rendering and previous/next links. Every page calls mountPage().

import { PARADOXES, TYPES, getParadox } from "../../paradoxes/registry.js";
import { SITE_NAME, REPO_URL } from "./config.js";
import { $, $$, h, storage } from "./lib/dom.js";

// Site root, resolved from this module's own URL so it works under any base path
// (e.g. https://user.github.io/paradox-lab/).
export const SITE_ROOT = new URL("../../", import.meta.url);
export const paradoxUrl = (slug) => new URL(`paradoxes/${slug}/`, SITE_ROOT).href;
export const assetUrl = (path) => new URL(path, SITE_ROOT).href;

const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  <path d="M16 3 L29 26 H3 Z" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M16 11 L22.5 22.5 H9.5 Z" fill="var(--accent)" opacity=".25"/>
  <circle cx="16" cy="19" r="2.4" fill="var(--ink)"/>
</svg>`;

const SUN = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
const MOON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>`;
const GITHUB = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>`;

// ---------- Theme ----------

function currentTheme() {
  const explicit = document.documentElement.dataset.theme;
  if (explicit) return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function themeButton() {
  const btn = h("button", { type: "button", class: "icon-btn", "data-theme-toggle": true });
  const sync = () => {
    const dark = currentTheme() === "dark";
    btn.innerHTML = dark ? SUN : MOON;
    btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    btn.title = btn.getAttribute("aria-label");
  };
  btn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    // Stored as a raw string (not JSON) because theme-init.js reads it before any module loads.
    try {
      localStorage.setItem("paradox-lab:theme", next);
    } catch {
      /* ignore */
    }
    sync();
    document.dispatchEvent(new CustomEvent("themechange", { detail: next }));
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", sync);
  sync();
  return btn;
}

// ---------- Header / footer ----------

function renderHeader() {
  const slot = $("[data-site-header]");
  if (!slot) return;
  slot.className = "site-header";
  slot.replaceChildren(
    h(
      "div",
      { class: "container" },
      h("a", { class: "brand", href: SITE_ROOT.href, html: `${LOGO}<span>${SITE_NAME}</span>` }),
      h(
        "nav",
        { class: "site-nav", "aria-label": "Site" },
        h("a", { href: `${SITE_ROOT.href}#paradoxes` }, "All paradoxes"),
        h("a", { href: REPO_URL, class: "gh-link", "aria-label": "Source code on GitHub", html: `${GITHUB}<span class="nav-text">GitHub</span>` }),
      ),
      themeButton(),
    ),
  );
}

function renderFooter() {
  const slot = $("[data-site-footer]");
  if (!slot) return;
  slot.className = "site-footer";
  slot.replaceChildren(
    h(
      "div",
      { class: "container" },
      h("p", { html: `${SITE_NAME}: interactive explorations of famous paradoxes. <a href="${REPO_URL}">Source on GitHub</a> · MIT licence.` }),
      h("p", { html: `Paradox types follow W.&nbsp;V.&nbsp;O. Quine, <cite>The Ways of Paradox</cite> (1962).` }),
    ),
  );
}

// ---------- Paradox hero + pager ----------

export function badge(type) {
  return h("span", { class: "badge", "data-type": type }, TYPES[type].label);
}

function renderHero(p) {
  const slot = $("[data-paradox-hero]");
  if (!slot || !p) return;
  slot.className = "paradox-hero";
  slot.dataset.type = p.type;
  slot.replaceChildren(
    h("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, h("a", { href: SITE_ROOT.href }, "All paradoxes"), " / ", h("a", { href: `${SITE_ROOT.href}#${p.type}` }, TYPES[p.type].label)),
    h("div", { class: "hero-meta" }, badge(p.type), h("span", { class: "visually-hidden" }, `${TYPES[p.type].tagline}`)),
    h("h1", {}, p.title),
    h("p", { class: "type-reason" }, h("strong", {}, `Why ${TYPES[p.type].label.toLowerCase()}? `), p.reason),
  );
  document.title = `${p.title} · ${SITE_NAME}`;
}

function renderPager(p) {
  const slot = $("[data-pager]");
  if (!slot || !p) return;
  const i = PARADOXES.indexOf(p);
  const prev = PARADOXES[(i - 1 + PARADOXES.length) % PARADOXES.length];
  const next = PARADOXES[(i + 1) % PARADOXES.length];
  slot.className = "pager";
  slot.setAttribute("aria-label", "More paradoxes");
  slot.replaceChildren(
    h("a", { href: paradoxUrl(prev.slug), class: "prev" }, h("span", { class: "dir" }, "← Previous"), h("span", { class: "pager-title" }, prev.title)),
    h("a", { href: paradoxUrl(next.slug), class: "next" }, h("span", { class: "dir" }, "Next →"), h("span", { class: "pager-title" }, next.title)),
  );
}

// ---------- Guess before reveal ----------
//
// Markup:
//   <section data-guess data-answer="switch"> <form> radios name="guess" ... </form>
//     <div class="guess-result" data-guess-result></div> </section>
//   Any [data-reveal] element is hidden until the user guesses or skips.
//   Optional per-option feedback: <label class="guess-option" data-feedback="...">.

function initGuess(slug) {
  const section = $("[data-guess]");
  if (!section) return;
  const form = $("form", section);
  const result = $("[data-guess-result]", section);
  const answer = section.dataset.answer;
  const reveals = $$("[data-reveal]");
  const key = `guess:${slug}`;

  const locked = reveals.map((el) => {
    const note = h("p", { class: "why-locked" }, "Make a guess above (or skip) to unlock the explanation.");
    return { el, note };
  });

  const hide = () => {
    for (const { el, note } of locked) {
      for (const child of [...el.children]) if (child.tagName !== "H2") child.hidden = true;
      el.append(note);
    }
  };

  const reveal = ({ guessed, focus }) => {
    for (const { el, note } of locked) {
      note.remove();
      for (const child of [...el.children]) child.hidden = false;
    }
    for (const input of $$("input[name=guess]", form)) {
      const label = input.closest(".guess-option");
      label?.classList.toggle("is-correct", input.value === answer);
      label?.classList.toggle("is-wrong", input.value === guessed && guessed !== answer);
      input.disabled = true;
    }
    $$("button", form).forEach((b) => (b.hidden = true));
    const correctLabel = $(`input[value="${answer}"]`, form)?.closest(".guess-option");
    const answerText = section.querySelector("[data-answer-text]")?.innerHTML ?? "";
    let headline;
    if (guessed == null) headline = "No guess? No problem.";
    else if (guessed === answer) headline = "You got it, which puts you ahead of most people.";
    else headline = $(`input[value="${guessed}"]`, form)?.closest(".guess-option")?.dataset.feedback ?? "Not quite, and you are in very good company.";
    result.className = `guess-result callout ${guessed == null ? "" : guessed === answer ? "is-good" : "is-warn"}`;
    result.innerHTML = `<p><strong>${headline}</strong></p>${answerText ? `<p>${answerText}</p>` : ""}<p><a href="#why">Jump to the explanation ↓</a></p>`;
    if (correctLabel && guessed == null) correctLabel.classList.add("is-correct");
    renderMath(result);
    if (focus) result.focus?.();
    storage.set(key, { guessed });
  };

  result.tabIndex = -1;
  hide();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const chosen = new FormData(form).get("guess");
    if (!chosen) {
      result.className = "guess-result callout is-warn";
      result.innerHTML = "<p>Pick one of the options first (or skip).</p>";
      return;
    }
    reveal({ guessed: chosen, focus: true });
  });
  $("[data-skip]", form)?.addEventListener("click", () => reveal({ guessed: null, focus: true }));

  // Returning visitors keep their earlier guess.
  const saved = storage.get(key);
  if (saved) {
    const input = saved.guessed && $(`input[value="${saved.guessed}"]`, form);
    if (input) input.checked = true;
    reveal({ guessed: saved.guessed ?? null, focus: false });
  }
}

// ---------- KaTeX ----------

const KATEX_OPTS = {
  delimiters: [
    { left: "$$", right: "$$", display: true },
    { left: "\\(", right: "\\)", display: false },
  ],
  throwOnError: false,
};

export function renderMath(root = document.body) {
  const go = () => window.renderMathInElement?.(root, KATEX_OPTS);
  if (window.renderMathInElement) go();
  else window.addEventListener("load", go, { once: true });
}

// ---------- Entry point ----------

export function mountPage() {
  const slug = document.body.dataset.slug;
  const p = slug ? getParadox(slug) : null;
  renderHeader();
  renderFooter();
  if (p) {
    renderHero(p);
    renderPager(p);
    initGuess(slug);
  }
  renderMath();
  return p;
}
