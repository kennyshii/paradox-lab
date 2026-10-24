import { test } from "node:test";
import assert from "node:assert/strict";
import { PIECES, HOLE, SLIVERS, WIDTH, HEIGHT, area, placed } from "../paradoxes/missing-square/model.js";
import { split, stepHolds, proofSteps } from "../paradoxes/all-horses-same-color/model.js";
import { covered, harmonicPartial, checkpointsPassed, geometricPartial } from "../paradoxes/zeno-dichotomy/model.js";

// Count which unit cells of the 13×5 box are covered by a set of polygons (sampling cell centres).
function inside([px, py], pts) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

test("missing square: pieces total 32, slivers are half a square each", () => {
  assert.equal(PIECES.reduce((s, p) => s + area(p.points), 0), 32);
  assert.equal(area(SLIVERS.A), 0.5);
  assert.equal(area(SLIVERS.B), 0.5);
  assert.equal((WIDTH * HEIGHT) / 2, 32.5);
});

test("missing square: no overlaps in either arrangement, and B leaves exactly the hole", () => {
  for (const t of [0, 1]) {
    const shapes = PIECES.map((p) => placed(p, t));
    for (let x = 0; x < WIDTH; x++) {
      for (let y = 0; y < HEIGHT; y++) {
        const c = [x + 0.5, y + 0.5];
        const count = shapes.filter((s) => inside(c, s)).length;
        assert.ok(count <= 1, `overlap at ${c} (t=${t})`);
      }
    }
  }
  const b = PIECES.map((p) => placed(p, 1));
  assert.ok(!b.some((s) => inside([10.5, 0.5], s)), "hole cell should be empty");
  assert.equal(area(HOLE), 1);
});

test("horses: only the 1 → 2 step fails", () => {
  assert.deepEqual(split(2).overlap, []);
  assert.equal(stepHolds(2), false);
  for (let m = 3; m <= 10; m++) assert.equal(stepHolds(m), true, `m=${m}`);
  const broken = proofSteps(2).filter((s) => !s.ok).map((s) => s.id);
  assert.deepEqual(broken, ["link", "done"]);
  assert.ok(proofSteps(5).every((s) => s.ok));
});

test("zeno: partial sums approach 1, harmonic sums grow without bound", () => {
  assert.equal(covered(1), 0.5);
  assert.equal(covered(10), 1 - 1 / 1024);
  assert.equal(geometricPartial(10), covered(10));
  assert.ok(harmonicPartial(10_000) > 9);
  assert.equal(checkpointsPassed(0.75), 2);
  assert.equal(checkpointsPassed(0.74), 1);
});
