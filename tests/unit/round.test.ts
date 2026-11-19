import { expect, test } from "vitest";
import { Round } from "../../client/game/round.js";
import { bananaSequence } from "../../client/game/sequence.js";

test("switching to the correct lane catches the banana immediately during flight", () => {
  const round = new Round();
  round.catchBanana("upper-left");
  expect(round.bananas[0]).toBeUndefined();
  round.start();
  round.advance(499);
  round.catchBanana("upper-left");
  expect(round.caught).toBe(0);
  round.advance(1);
  expect(round.bananas[0]).toEqual({
    lane: "upper-left",
    progress: 0,
    fall: 0,
  });
  round.advance(400);
  round.catchBanana("lower-left");
  expect(round.bananas[0]?.progress).toBeCloseTo(400 / 2100);
  round.catchBanana("upper-left");
  expect(round.caught).toBe(1);
  round.catchBanana("upper-left");
  expect(round.caught).toBe(1);
  expect(round.bananas[0]).toBeUndefined();
});

test("a banana falls to the floor, counts once at impact and cannot be caught while falling", () => {
  const round = new Round();
  round.start();
  round.advance(2600);
  round.advance(170);
  round.catchBanana("upper-left");
  expect(round.bananas[0]).toEqual({
    lane: "upper-left",
    progress: 1,
    fall: 0.5,
  });
  expect(round.caught).toBe(0);
  expect(round.missed).toBe(0);
  round.advance(169);
  expect(round.missed).toBe(0);
  round.advance(1);
  expect(round.missed).toBe(1);
  expect(round.bananas[0]?.fall).toBe(1);
  round.advance(159);
  expect(round.missed).toBe(1);
  round.advance(1);
  expect(round.bananas).toEqual([]);
  round.advance(200);
  expect(round.bananas[0]).toEqual({
    lane: "lower-left",
    progress: 0,
    fall: 0,
  });
});

test("a long frame accounts for misses once and stops on the sixth", () => {
  const round = new Round();
  round.resume();
  expect(round.state).toBe("ready");
  round.start();
  round.advance(20000);
  expect(round.missed).toBe(6);
  expect(round.state).toBe("lost");
  round.advance(5000);
  expect(round.missed).toBe(6);
  round.start();
  expect(round.state).toBe("playing");
  expect(round.caught).toBe(0);
  expect(round.missed).toBe(0);
  expect(round.bananas[0]).toBeUndefined();
});

test("paused time does not advance launch or catch windows", () => {
  const round = new Round();
  round.start();
  round.advance(1000);
  const banana = round.bananas[0];
  round.pause();
  round.pause();
  round.advance(20000);
  expect(round.bananas[0]).toEqual(banana);
  round.resume();
  round.catchBanana("upper-left");
  expect(round.caught).toBe(1);
});

test("overlapping flights can be caught independently and fall only once", () => {
  let draw = 0;
  const round = new Round(() => (draw++ % 2 === 0 ? 0 : 0.99));
  round.start();
  const intro = [
    "upper-left",
    "lower-left",
    "upper-right",
    "lower-right",
  ] as const;
  for (let index = 0; index < 16; index++) {
    round.advance(index === 0 ? 500 : 2800);
    round.catchBanana(intro[index % 4]!);
  }
  round.advance(4000);
  expect(round.bananas.map(({ lane }) => lane)).toEqual([
    "upper-left",
    "lower-right",
  ]);
  round.catchBanana("lower-right");
  expect(round.caught).toBe(17);
  expect(round.bananas.map(({ lane }) => lane)).toEqual(["upper-left"]);
  round.advance(640);
  expect(round.missed).toBe(1);
  round.advance(160);
  expect(round.missed).toBe(1);
  expect(round.bananas).toEqual([]);
});

test("every banana can be caught in deadline order even at maximum tempo", () => {
  const random = () => {
    let seed = 27;
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
  };
  const round = new Round(random());
  const sequence = bananaSequence(random());
  round.start();
  let now = 0;
  for (let index = 0; index < 500; index++) {
    const { lane, deadline } = sequence.next().value;
    const catchAt = deadline - 1;
    round.advance(catchAt - now);
    round.catchBanana(lane);
    expect(round.caught).toBe(index + 1);
    now = catchAt;
  }
  expect(round.caught).toBe(500);
  expect(round.missed).toBe(0);
});

test("two bananas from the same cannon require two catches", () => {
  const round = new Round(() => 0);
  const sequence = bananaSequence(() => 0);
  round.start();
  let now = 0;
  let item = sequence.next().value;
  while (item.launch < 45_000) {
    round.advance(item.launch - now);
    round.catchBanana(item.lane);
    now = item.launch;
    item = sequence.next().value;
  }

  round.advance(sequence.next().value.launch - now);
  expect(round.bananas.map(({ lane }) => lane)).toEqual([
    "upper-left",
    "upper-left",
  ]);
  const before = round.caught;
  round.catchBanana("upper-left");
  expect(round.caught).toBe(before + 1);
  expect(round.bananas).toHaveLength(1);
  round.advance(100);
  expect(round.caught).toBe(before + 1);
  round.catchBanana("upper-left");
  expect(round.caught).toBe(before + 2);
  expect(round.bananas).toHaveLength(0);
});
