import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, isOneToOne, applyPlan, freeRooms } from "../paradoxes/infinite-hotel/model.js";

test("every plan sends different guests to different rooms", () => {
  for (const key of ["one", "coach", "bus"]) assert.ok(isOneToOne(PLANS[key].move), key);
  assert.ok(isOneToOne(PLANS.buses.move, 40));
});

test("newcomers never collide with the moved guests", () => {
  const taken = new Set(Array.from({ length: 500 }, (_, i) => PLANS.bus.move(i + 1)));
  for (let m = 1; m <= 500; m++) assert.ok(!taken.has(PLANS.bus.arrive(m)));
});

test("a full hotel still fits a new guest", () => {
  let id = 0;
  const full = Array.from({ length: 30 }, () => ({ id: id++ }));
  const { rooms, arrivals } = applyPlan(full, PLANS.one, () => ({ id: "new" }));
  assert.equal(arrivals[0].to, 1);
  assert.deepEqual(freeRooms(rooms), []);
});

test("doubling empties exactly the odd rooms before the bus arrives", () => {
  const full = Array.from({ length: 20 }, (_, i) => ({ id: i }));
  const moved = full.map((_, i) => PLANS.bus.move(i + 1)).filter((r) => r <= 20);
  assert.deepEqual(moved, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
  const { rooms } = applyPlan(full, PLANS.bus, (b, m) => ({ bus: b, m }));
  assert.deepEqual(freeRooms(rooms), []);
});
