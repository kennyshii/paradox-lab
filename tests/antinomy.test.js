import { test } from "node:test";
import assert from "node:assert/strict";
import { PRESETS, verdict, revise, truthTable } from "../paradoxes/liar-paradox/model.js";
import { testBarber, russellRow, differsOnDiagonal, testRussell } from "../paradoxes/russells-paradox/model.js";

test("liar: classic examples get the right verdicts", () => {
  assert.equal(verdict(PRESETS.liar.sentences).kind, "paradox");
  assert.equal(verdict(PRESETS.truthTeller.sentences).kind, "underdetermined");
  assert.equal(verdict(PRESETS.cycle.sentences).kind, "paradox");
  assert.equal(verdict(PRESETS.accusers.sentences).count, 2);
  assert.equal(verdict(PRESETS.grounded.sentences).kind, "grounded");
  assert.equal(verdict(PRESETS.triangle.sentences).kind, "paradox");
});

test("liar: truth table rows are ordered and complete", () => {
  const rows = truthTable(PRESETS.cycle.sentences);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0].assignment, [true, true]);
  assert.deepEqual(rows[3].assignment, [false, false]);
});

test("liar: revision of the liar oscillates", () => {
  const seq = revise(PRESETS.liar.sentences, [true], 4).map((r) => r[0]);
  assert.deepEqual(seq, [true, false, true, false, true]);
});

test("barber: both suppositions are contradictory", () => {
  assert.equal(testBarber(true).consistent, false);
  assert.equal(testBarber(false).consistent, false);
});

test("russell: R differs from every set on the diagonal, and R ∈ R is undecidable", () => {
  const contains = [
    [true, false, true],
    [false, false, true],
    [true, true, true],
  ];
  assert.deepEqual(russellRow(contains), [false, true, false]);
  assert.ok(differsOnDiagonal(contains));
  assert.equal(testRussell(true).consistent, false);
  assert.equal(testRussell(false).consistent, false);
});
