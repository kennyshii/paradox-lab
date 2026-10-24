# Contributing to Paradox Lab

Thanks for helping! New paradoxes, better explanations, accessibility fixes and bug reports are all welcome.

## Ground rules

- **No build step.** Plain HTML, CSS and ES modules only. If you need a library, load a pinned version from a CDN (jsDelivr, cdnjs or unpkg) and explain why in your PR.
- **Pure models.** Maths and logic go in `model.js` with no DOM access, so they can be tested with `node --test`.
- **Accessible by default.** Every control is a real `<button>`, `<input>` or `<select>` with a label. Visualisations have `role="img"` and an `aria-label` (or a text summary nearby) that is updated when they change. Readouts that change use `aria-live="polite"`.
- **Theme-aware.** Use the CSS variables from `assets/css/main.css` (`--ink`, `--surface`, `--chart-1`…`--chart-4`, `--good`, `--bad`, …), never hard-coded colours that only work in one theme.
- **Motion-safe.** Use `tween()` from `assets/js/lib/sim.js`, which skips animation when the user prefers reduced motion.

## Adding a paradox

```bash
cp -r paradoxes/_template paradoxes/<slug>
```

Then:

1. **Registry**: add an entry to `paradoxes/registry.js`:

   ```js
   {
     slug: "<slug>",                 // folder name, kebab-case
     title: "The Name of the Paradox",
     type: "veridical",              // "veridical" | "falsidical" | "antinomy"
     teaser: "One or two sentences for the home-page card.",
     reason: "One line on why it belongs in this category.",
   },
   ```

2. **`index.html`**: set `<body data-slug="<slug>">`, the `<title>` and meta description, then fill in the five sections.
3. **`model.js`**: the maths, as small exported pure functions.
4. **`main.js`**: call `mountPage()`, then wire controls to the model and draw.
5. **`thumb.svg`**: a 320×180 card image. Use a dark tinted background so it looks good in both themes.
6. **`tests/<slug>.test.js`**: test the model, especially the numbers quoted in the explanation.

### Page checklist

Every paradox page must have, in this order:

- [ ] **The paradox**: one paragraph stating it, ending on the question that makes it feel wrong
- [ ] **Make a guess**: a `[data-guess]` form with `data-answer` set to the correct option’s value; wrong options can have `data-feedback`; a hidden `[data-answer-text]` with the short answer
- [ ] **Explore**: the interactive visualisation
- [ ] **Why it works**: `[data-reveal]` section with the maths or logic (KaTeX: `$$…$$` for display, `\(…\)` inline) and a closing “Why it’s *type*” paragraph
- [ ] **Type badge and reason**: generated automatically from the registry
- [ ] **Further reading**: 2–4 reputable links (Wikipedia, Stanford Encyclopedia of Philosophy, papers, well-known videos)

### Shared helpers

| Module | Use it for |
| --- | --- |
| `assets/js/page.js` | `mountPage()`, `renderMath(el)` for content you inject after load |
| `assets/js/lib/chart.js` | `lineChart(container, opts)` for responsive SVG line/dot charts; `svg(tag, attrs, parent)` for custom drawings |
| `assets/js/lib/sim.js` | `Tally`, `runTrials({ total, trial, onProgress })` for simulations that don’t freeze the page; `tween(ms, fn)` |
| `assets/js/lib/random.js` | `mulberry32(seed)` (seedable, great in tests), `randInt`, `pick`, `shuffle` |
| `assets/js/lib/dom.js` | `h()` element builder, `bindRange`, `segmented` toggle groups, `storage` |
| `assets/js/lib/format.js` | `pct`, `fmt`, `length`, `fraction` |

### Shared CSS components

`.card`, `.lab-panel`, `.lab-grid`, `.controls` + `.field`, `.segmented` (buttons with `aria-pressed`), `.btn` / `.btn-primary` / `.btn-ghost` / `.btn-sm`, `.stats` + `.stat`, `.viz`, `.callout` (`.is-good` / `.is-bad` / `.is-warn`), `table.data`, `.legend`.

## Before opening a PR

```bash
npm test                       # model tests
python3 -m http.server 8000    # then click through your page
```

- Check it in light and dark mode, at phone width (~375px), and using only the keyboard.
- Make sure the browser console is clean.
- Keep PRs focused: one paradox or one fix per PR.

## Reporting issues

Found a mistake in an explanation? Please open an issue quoting the sentence and, if you can, a source. Accuracy matters more than anything else here.
