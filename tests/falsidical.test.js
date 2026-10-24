import { test } from "node:test";
import assert from "node:assert/strict";
import { PIECES, HOLE, SLIVERS, WIDTH, HEIGHT, area, placed } from "../paradoxes/missing-square/model.js";
import { story } from "../paradoxes/missing-dollar/model.js";
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

test("missing dollar: the money always balances; only the bogus sum is off", () => {
  const s = story();
  assert.equal(s.friendsPaid, 27);
  assert.equal(s.wrongSum, 29);
  assert.equal(s.friendsPaid, s.price + s.kept); // the $2 is already inside the $27
  assert.equal(s.price + s.kept + s.returned, 30);
  for (let price = 20; price <= 29; price++) {
    for (let kept = 0; kept <= 30 - price; kept += 0.5) {
      const t = story({ price, kept });
      assert.equal(t.price + t.kept + t.returned, 30);
      assert.equal(t.wrongSum - t.paid, 2 * kept - (30 - price)); // the "missing" amount is just a meaningless sum
    }
  }
});

test("zeno: partial sums approach 1, harmonic sums grow without bound", () => {
  assert.equal(covered(1), 0.5);
  assert.equal(covered(10), 1 - 1 / 1024);
  assert.equal(geometricPartial(10), covered(10));
  assert.ok(harmonicPartial(10_000) > 9);
  assert.equal(checkpointsPassed(0.75), 2);
  assert.equal(checkpointsPassed(0.74), 1);
});
