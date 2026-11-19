import { expect, test } from "vitest";
import { lanes } from "../../client/game/input.js";
import { bananaSequence } from "../../client/game/sequence.js";

function sample(seed: number, length: number) {
  const sequence = bananaSequence(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  });
  return Array.from({ length }, () => sequence.next().value);
}

test("tempo changes every 45 seconds of play and levels off at four in flight", () => {
  const items = sample(7, 500);
  expect(items[0]?.launch).toBe(500);
  const active: typeof items = [];
  const peaks = [0, 0, 0, 0];
  for (const [index, item] of items.entries()) {
    const stage = Math.min(Math.floor(item.launch / 45000), 3);
    expect(item.flight).toBe([2100, 1500, 1240, 1220][stage]);
    active.push(item);
    while (active[0]!.deadline <= item.launch) active.shift();
    peaks[stage] = Math.max(peaks[stage]!, active.length);
    const next = items[index + 1];
    if (next)
      expect(next.launch - item.launch).toBe([2800, 1200, 600, 400][stage]);
  }
  expect(peaks).toEqual([1, 2, 3, 4]);
});

test("seeded runs vary lanes and leave a feasible 400 ms switching schedule", () => {
  expect(sample(7, 500)).toEqual(sample(7, 500));
  expect(sample(7, 500)).not.toEqual(sample(8, 500));
  for (let seed = 0; seed < 40; seed++) {
    const items = sample(seed, 2000);
    expect(items.slice(0, 4).map((item) => item.lane)).toEqual(lanes);
    expect(new Set(items.slice(16).map((item) => item.lane))).toEqual(
      new Set(lanes),
    );
    for (let index = 1; index < items.length; index++) {
      // One millisecond before each deadline is still in the catch window.
      const catchAt = items[index]!.deadline - 1;
      if (
        catchAt < items[index]!.launch ||
        catchAt - (items[index - 1]!.deadline - 1) < 400
      ) {
        throw new Error(`Impossible catch for seed ${seed}, banana ${index}`);
      }
    }
  }
});
