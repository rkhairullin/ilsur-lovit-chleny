import { expect, test } from "vitest";
import { Round } from "../../client/games/ilsur-lovit-chleny/round.js";
import { bananaSequence } from "../../client/games/ilsur-lovit-chleny/sequence.js";

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
    decoy: false,
    golden: false,
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
    decoy: false,
    golden: false,
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
    decoy: false,
    golden: false,
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
  const draws = [...Array<number>(18).fill(0), 0.99];
  const round = new Round(() => draws.shift() ?? 0);
  round.start();
  for (let index = 0; index < 16; index++) {
    round.advance(index === 0 ? 500 : 2800);
    if (index !== 11) round.catchBanana("upper-left");
  }
  round.advance(4000);
  expect(round.bananas.map(({ lane }) => lane)).toEqual([
    "upper-left",
    "lower-right",
  ]);
  round.catchBanana("lower-right");
  expect(round.caught).toBe(16);
  expect(round.bananas.map(({ lane }) => lane)).toEqual(["upper-left"]);
  round.advance(640);
  expect(round.missed).toBe(1);
  round.advance(160);
  expect(round.missed).toBe(1);
  expect(round.bananas).toEqual([]);
});

test("every regular banana can be caught in deadline order while avoiding decoys", () => {
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
  let caught = 0;
  for (let index = 0; index < 500; index++) {
    const { lane, deadline, decoy } = sequence.next().value;
    const catchAt = deadline - 1;
    round.advance(catchAt - now);
    if (!decoy) {
      round.catchBanana(lane);
      caught++;
    }
    expect(round.caught).toBe(caught);
    now = catchAt;
  }
  expect(round.caught).toBeGreaterThan(400);
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
    let item = sequence.next().value;
    while (item.decoy) item = sequence.next().value;
    const catchAt = item.deadline - 1;
    round.advance(catchAt - now);
    round.catchBanana(item.lane);
    now = catchAt;
    if (scores.has(caught)) expect(round.score).toBe(scores.get(caught));
  }
  expect(round.streak).toBe(21);
  expect(round.multiplier).toBe(3);

  let missed = sequence.next().value;
  while (missed.decoy) missed = sequence.next().value;
  const impact = missed.deadline + 340;
  round.advance(impact - now);
  now = impact;
  expect(round.missed).toBe(1);
  expect(round.score).toBe(330);
  expect(round.streak).toBe(0);
  expect(round.multiplier).toBe(1);
  let next = sequence.next().value;
  while (next.decoy) next = sequence.next().value;
  round.advance(next.deadline - 1 - now);
  round.catchBanana(next.lane);
  expect(round.score).toBe(340);
  expect(round.streak).toBe(1);

  round.start();
  expect(round.score).toBe(0);
  expect(round.streak).toBe(0);
  expect(round.multiplier).toBe(1);
});

test("the sixth impact freezes scoring even during the last landing animation", () => {
  const round = new Round(() => 0.125);
  const sequence = bananaSequence(() => 0.125);
  round.start();
  let now = 0;
  let item = sequence.next().value;
  while (item.launch < 135_000) {
    const catchAt = item.deadline - 1;
    round.advance(catchAt - now);
    if (!item.decoy) round.catchBanana(item.lane);
    now = catchAt;
    item = sequence.next().value;
  }
  for (let index = 0; index < 6; index++) {
    while (item.decoy || item.golden) item = sequence.next().value;
    if (index < 5) item = sequence.next().value;
  }
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

function reachFirstDecoy(round: Round, random: () => number, misses = 0) {
  const sequence = bananaSequence(random);
  round.start();
  let now = 0;
  let item = sequence.next().value;
  while (!item.decoy) {
    const time = item.deadline - 1;
    round.advance(time - now);
    if (misses > 0) misses--;
    else round.catchBanana(item.lane);
    now = time;
    item = sequence.next().value;
  }
  round.advance(item.launch - now);
  return { item, sequence };
}

test("ignoring an isolated decoy preserves misses, points and streak", () => {
  const random = () => 0.125;
  const round = new Round(random);
  const { item } = reachFirstDecoy(round, random);
  const { score, caught, streak } = round;
  expect(round.bananas).toEqual([
    { lane: item.lane, decoy: true, golden: false, progress: 0, fall: 0 },
  ]);
  round.advance(item.flight);
  expect(round.catchBanana(item.lane)).toBeUndefined();
  round.advance(500);
  expect(round).toMatchObject({ score, caught, streak, missed: 0 });
});

test("catching a decoy counts exactly one miss and resets the streak without awarding points", () => {
  const random = () => 0.125;
  const round = new Round(random);
  const { item } = reachFirstDecoy(round, random);
  const { score, caught } = round;
  expect(round.catchBanana(item.lane)).toBe("decoy");
  expect(round.catchBanana(item.lane)).toBeUndefined();
  round.advance(item.flight + 340);
  expect(round).toMatchObject({ score, caught, streak: 0, missed: 1 });
});

test("catching a decoy as the sixth miss ends the round", () => {
  const random = () => 0.125;
  const round = new Round(random);
  const { item } = reachFirstDecoy(round, random, 5);
  expect(round.missed).toBe(5);
  expect(round.catchBanana(item.lane)).toBe("decoy");
  round.advance(160);
  expect(round).toMatchObject({ missed: 6, state: "lost" });
});

function reachOverlappingDecoy(round: Round, misses = 0) {
  const { item, sequence } = reachFirstDecoy(round, () => 0, misses);
  let now = item.launch;
  let regular = sequence.next().value;
  let next = sequence.next().value;
  while (!next.decoy) {
    round.advance(regular.launch - now);
    round.catchBanana(regular.lane);
    now = regular.launch;
    regular = next;
    next = sequence.next().value;
  }
  round.advance(next.launch - now);
  return { regular, decoy: next };
}

test("a same-lane press resolves the earliest available item before a later decoy", () => {
  const round = new Round(() => 0);
  const { regular, decoy } = reachOverlappingDecoy(round);
  expect(round.catchBanana(regular.lane)).toMatchObject({ golden: false });
  expect(round.catchBanana(decoy.lane)).toBe("decoy");
  expect(round.missed).toBe(1);
});

test("a regular banana landing after a fatal decoy cannot add a seventh miss", () => {
  const round = new Round(() => 0);
  const { regular, decoy } = reachOverlappingDecoy(round, 5);
  round.advance(regular.deadline + 300 - decoy.launch);
  expect(round.catchBanana(decoy.lane)).toBe("decoy");
  round.advance(160);
  expect(round).toMatchObject({ missed: 6, state: "lost" });
});

function reachGolden(round: Round) {
  let now = 0;
  round.start();
  for (const item of bananaSequence(() => 0)) {
    const catchAt = item.deadline - 1;
    round.advance(catchAt - now);
    if (item.golden) return item;
    if (!item.decoy) round.catchBanana(item.lane);
    now = catchAt;
  }
  throw new Error("No golden banana");
}

test("golden catch adds twenty points to the multiplied catch and counts once", () => {
  const round = new Round(() => 0);
  const golden = reachGolden(round);
  const { score, multiplier, caught, streak } = round;
  expect(round.catchBanana(golden.lane)).toMatchObject({ golden: true });
  expect(round).toMatchObject({
    score: score + 10 * multiplier + 20,
    caught: caught + 1,
    streak: streak + 1,
    missed: 0,
  });
  round.advance(500);
  expect(round.score).toBe(score + 10 * multiplier + 20);
  expect(round.missed).toBe(0);
});

test("letting a golden banana land preserves the score, streak and misses", () => {
  const round = new Round(() => 0);
  reachGolden(round);
  const { score, streak, caught } = round;
  round.advance(501);
  expect(round).toMatchObject({ score, streak, caught, missed: 0 });
  expect(round.bananas.some(({ golden }) => golden)).toBe(false);
});
