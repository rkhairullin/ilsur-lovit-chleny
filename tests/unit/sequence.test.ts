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
    if (next) {
      expect(next.launch - item.launch).toBe([2800, 1200, 600, 400][stage]);
    }
  }
  expect(peaks).toEqual([1, 2, 3, 4]);
});

test("seeded runs vary lanes and leave a feasible 400 ms switching schedule", () => {
  expect(sample(7, 500)).toEqual(sample(7, 500));
  expect(sample(7, 500)).not.toEqual(sample(8, 500));
  for (let seed = 0; seed < 40; seed++) {
    const items = sample(seed, 2000);
    expect(new Set(items.map((item) => item.lane))).toEqual(new Set(lanes));
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

test("the first banana can use any lane and the next can repeat it", () => {
  for (const [index, lane] of lanes.entries()) {
    const sequence = bananaSequence(() => (index + 0.5) / lanes.length);
    expect(sequence.next().value.lane).toBe(lane);
    expect(sequence.next().value.lane).toBe(lane);
  }
});

test("the first decoy flies alone on the first launch after 30 seconds", () => {
  const items = sample(17, 50);
  const intro = items.findIndex(({ decoy }) => decoy);
  expect(items[intro]!.launch).toBe(31_300);
  expect(items[intro]!.launch).toBeGreaterThan(
    items[intro - 1]!.deadline + 500,
  );
  expect(items[intro + 1]!.launch).toBeGreaterThan(
    items[intro]!.deadline + 500,
  );
});

test.each([
  [0, 8],
  [0.45, 10],
  [0.999, 12],
])(
  "roll %s schedules the next decoy after %s regulars and at least six seconds",
  (roll, regularsRequired) => {
    const sequence = bananaSequence(() => roll);
    let previousDecoy: number | undefined;
    let regulars = 0;
    let decoys = 0;
    for (let i = 0; i < 400; i++) {
      const { decoy, golden, launch } = sequence.next().value;
      if (previousDecoy !== undefined) {
        expect(decoy).toBe(
          regulars >= regularsRequired && launch - previousDecoy >= 6000,
        );
      }
      if (decoy) {
        previousDecoy = launch;
        regulars = 0;
        decoys++;
      } else if (!golden) {
        regulars++;
      }
    }
    expect(decoys).toBeGreaterThan(20);
  },
);

test("golden bananas and decoys never share a launch and only ordinary bananas count toward the next bonus", () => {
  const items = sample(7, 600);
  let bonuses = 0;
  let ordinary = 0;
  for (const { golden, decoy, launch } of items) {
    expect(golden).toBe(
      !decoy && launch >= 60_000 && (bonuses === 0 || ordinary === 20),
    );
    if (golden) {
      bonuses++;
      ordinary = 0;
    } else if (!decoy) {
      ordinary++;
    }
  }
  expect(bonuses).toBeGreaterThan(20);
});
