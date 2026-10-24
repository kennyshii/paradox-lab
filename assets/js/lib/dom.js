// Small DOM helpers shared by every page.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/**
 * Create an element. `props` may contain attributes, `class`, `text`, `html`,
 * `dataset`, `style` (object) and `on` (event map). Children can be strings or nodes.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "text") el.textContent = value;
    else if (key === "html") el.innerHTML = value;
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key === "style") Object.assign(el.style, value);
    else if (key === "on") for (const [ev, fn] of Object.entries(value)) el.addEventListener(ev, fn);
    else el.setAttribute(key, value === true ? "" : value);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

/**
 * Wire a range input to an <output>, keeping aria-valuetext in sync.
 * Returns a function that re-reads the input and fires `onInput`.
 */
export function bindRange(input, { output, format = String, onInput } = {}) {
  const update = () => {
    const value = Number(input.value);
    const text = format(value);
    if (output) output.textContent = text;
    input.setAttribute("aria-valuetext", text);
    onInput?.(value);
  };
  input.addEventListener("input", update);
  update();
  return update;
}

/**
 * A group of buttons that behave like radio buttons using aria-pressed.
 * Buttons need a `data-value`. Returns { get, set }.
 */
export function segmented(group, { onChange } = {}) {
  const buttons = $$("button[data-value]", group);
  let current = buttons.find((b) => b.getAttribute("aria-pressed") === "true")?.dataset.value ?? buttons[0]?.dataset.value;
  const set = (value, { silent = false } = {}) => {
    current = value;
    for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.value === value));
    if (!silent) onChange?.(value);
  };
  for (const b of buttons) b.addEventListener("click", () => set(b.dataset.value));
  set(current, { silent: true });
  return { get: () => current, set };
}

/** localStorage wrapper that never throws (private mode, blocked storage, ...). */
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(`paradox-lab:${key}`);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`paradox-lab:${key}`, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
};
