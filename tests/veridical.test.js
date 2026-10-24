import { test } from "node:test";
import assert from "node:assert/strict";
import { mulberry32 } from "../assets/js/lib/random.js";
import { uniformGap, peakLift, extraForAngle } from "../paradoxes/rope-around-earth/model.js";
import { simulate, theory, hostLeavesClosed } from "../paradoxes/monty-hall/model.js";
import { pShared, pSharesMine, groupSizeFor, pairs, sampleGroup } from "../paradoxes/birthday-problem/model.js";
import { DATASETS, pooled, rate, summarise, standardised } from "../paradoxes/simpsons-paradox/model.js";
import { reducedWords, leftMultiply, inShiftedPiece } from "../paradoxes/banach-tarski/model.js";

const EARTH = 6_371_000;

test("rope: even lift is ΔL/2π whatever the radius", () => {
  for (const R of [0.12, EARTH, 6.9634e8]) assert.ok(Math.abs(uniformGap(1) - 0.159155) < 1e-6, `R=${R}`);
});

test("rope: one-point lift on Earth with 1 m of rope is about 121 m", () => {
  const { height, theta, groundSpan } = peakLift(EARTH, 1);
  assert.ok(height > 120 && height < 122.5, `height=${height}`);
  assert.ok(Math.abs(extraForAngle(EARTH, theta) - 1) < 1e-9);
  assert.ok(groundSpan > 38_000 && groundSpan < 40_000);
});

test("rope: small-angle approximation h ≈ (R/2)(3ΔL/2R)^(2/3)", () => {
  const approx = (EARTH / 2) * ((3 * 1) / (2 * EARTH)) ** (2 / 3);
  assert.ok(Math.abs(peakLift(EARTH, 1).height - approx) / approx < 0.01);
});

test("monty hall: host never reveals the car", () => {
  const rand = mulberry32(1);
  for (let i = 0; i < 1000; i++) {
    const car = i % 3;
    const pick = (i * 7) % 3;
    const kept = hostLeavesClosed({ doors: 3, car }, pick, rand);
    assert.notEqual(kept, pick);
    if (pick !== car) assert.equal(kept, car);
  }
});

test("monty hall: simulation converges to theory", () => {
  for (const doors of [3, 10]) {
    const rand = mulberry32(42);
    let sw = 0;
    const N = 50_000;
    for (let i = 0; i < N; i++) if (simulate(doors, rand).switch) sw++;
    assert.ok(Math.abs(sw / N - theory(doors).switch) < 0.01, `doors=${doors}: ${sw / N}`);
  }
});

test("birthday: 23 people is the first group over 50%", () => {
  assert.equal(groupSizeFor(0.5), 23);
  assert.ok(Math.abs(pShared(23) - 0.5073) < 1e-4);
  assert.equal(pairs(23), 253);
  assert.equal(pShared(366), 1);
  assert.ok(pSharesMine(254) > 0.5 && pSharesMine(253) < 0.5);
});

test("birthday: Monte Carlo agrees with the formula", () => {
  const rand = mulberry32(7);
  let hits = 0;
  const N = 20_000;
  for (let i = 0; i < N; i++) if (sampleGroup(23, rand).hasMatch) hits++;
  assert.ok(Math.abs(hits / N - pShared(23)) < 0.015);
});

test("simpson: kidney data reverses on aggregation", () => {
  const { groups } = DATASETS.kidney;
  assert.deepEqual(pooled(groups, "a"), [273, 350]);
  assert.deepEqual(pooled(groups, "b"), [289, 350]);
  const s = summarise(groups);
  assert.equal(s.aWins, 2);
  assert.ok(s.overallB > s.overallA);
  assert.ok(s.reversed);
  assert.ok(standardised(groups, "a") > standardised(groups, "b"));
});

test("simpson: Berkeley totals match the published figures", () => {
  const { groups } = DATASETS.berkeley;
  assert.deepEqual(pooled(groups, "a"), [1198, 2691]);
  assert.deepEqual(pooled(groups, "b"), [557, 1835]);
  assert.ok(rate(pooled(groups, "a")) > rate(pooled(groups, "b")));
});

test("banach-tarski: a⁻¹·W(a) is everything except W(a⁻¹)", () => {
  const words = reducedWords(5);
  assert.equal(words.length, 1 + 4 + 12 + 36 + 108 + 324);
  const shifted = new Set(words.filter((w) => w[0] === "a").map((w) => leftMultiply("A", w)));
  for (const w of reducedWords(4)) assert.equal(shifted.has(w), inShiftedPiece("a", w), w);
});
