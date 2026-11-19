import { expect, test } from "vitest";
import { Round } from "../../client/game/round.js";
import { bananaSequence } from "../../client/game/sequence.js";

test("switching to the correct lane catches the banana immediately during flight", () => {
  const round = new Round(() => 0);
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
  const draws = [0, 0.25];
  const round = new Round(() => draws.shift() ?? 0);
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
  const round = new Round(() => 0);
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
  const round = new Round(() => 0);
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
  const draws = [...Array<number>(17).fill(0), 0.99];
  const round = new Round(() => draws.shift() ?? 0);
  round.start();
  for (let index = 0; index < 16; index++) {
    round.advance(index === 0 ? 500 : 2800);
    round.catchBanana("upper-left");
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

test("the next catch after ten or twenty consecutive catches earns the new multiplier", () => {
  const round = new Round(() => 0);
  const sequence = bananaSequence(() => 0);
  const scores = new Map([
    [9, 90],
    [10, 100],
    [11, 120],
    [19, 280],
    [20, 300],
    [21, 330],
  ]);
  round.start();
  let now = 0;
  for (let caught = 1; caught <= 21; caught++) {
    const { lane, launch } = sequence.next().value;
    round.advance(launch - now);
    round.catchBanana(lane);
    now = launch;
    if (scores.has(caught)) expect(round.score).toBe(scores.get(caught));
  }
  expect(round.streak).toBe(21);
  expect(round.multiplier).toBe(3);

  const missed = sequence.next().value;
  const impact = missed.deadline + 340;
  round.advance(impact - now);
  now = impact;
  expect(round.missed).toBe(1);
  expect(round.score).toBe(330);
  expect(round.streak).toBe(0);
  expect(round.multiplier).toBe(1);
  const next = sequence.next().value;
  round.advance(Math.max(0, next.launch - now));
  round.catchBanana(next.lane);
  expect(round.score).toBe(340);
  expect(round.streak).toBe(1);

  round.start();
  expect(round.score).toBe(0);
  expect(round.streak).toBe(0);
  expect(round.multiplier).toBe(1);
});

test("the sixth impact freezes scoring even during the last landing animation", () => {
  const round = new Round(() => 0);
  const sequence = bananaSequence(() => 0);
  round.start();
  let now = 0;
  let item = sequence.next().value;
  while (item.launch < 135_000) {
    round.advance(item.launch - now);
    round.catchBanana(item.lane);
    now = item.launch;
    item = sequence.next().value;
  }
  for (let index = 0; index < 5; index++) item = sequence.next().value;
  const sixthImpact = item.deadline + 340;
  round.advance(sixthImpact - now - 1);
  expect(round.missed).toBe(5);
  expect(round.state).toBe("playing");

  const score = round.score;
  round.advance(1);
  expect(round.missed).toBe(6);
  expect(round.bananas.some(({ progress }) => progress < 1)).toBe(true);
  round.catchBanana(item.lane);
  expect(round.score).toBe(score);
  round.advance(160);
  expect(round.state).toBe("lost");
  round.catchBanana(item.lane);
  expect(round.score).toBe(score);
});
