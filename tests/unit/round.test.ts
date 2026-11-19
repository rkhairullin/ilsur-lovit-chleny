import { expect, test } from "vitest";
import { Round } from "../../client/game/round.js";

test("switching to the correct lane catches the banana immediately during flight", () => {
  const round = new Round();
  round.advance(500, "upper-left");
  expect(round.banana).toBeUndefined();
  round.start();
  round.advance(499, "upper-left");
  expect(round.caught).toBe(0);
  round.advance(1, undefined);
  expect(round.banana).toEqual({ lane: "upper-left", progress: 0, fall: 0 });
  round.advance(400, "lower-left");
  expect(round.banana?.progress).toBeCloseTo(400 / 1300);
  round.advance(0, "upper-left");
  expect(round.caught).toBe(1);
  round.advance(0, "upper-left");
  expect(round.caught).toBe(1);
  expect(round.banana).toBeUndefined();
});

test("a banana falls to the floor, counts once at impact and cannot be caught while falling", () => {
  const round = new Round();
  round.start();
  round.advance(1800, undefined);
  round.advance(170, "upper-left");
  expect(round.banana).toEqual({ lane: "upper-left", progress: 1, fall: 0.5 });
  expect(round.caught).toBe(0);
  expect(round.missed).toBe(0);
  round.advance(169, "upper-left");
  expect(round.missed).toBe(0);
  round.advance(1, "upper-left");
  expect(round.missed).toBe(1);
  expect(round.banana?.fall).toBe(1);
  round.advance(159, undefined);
  expect(round.missed).toBe(1);
  round.advance(1, undefined);
  expect(round.banana).toEqual({ lane: "lower-left", progress: 0, fall: 0 });
});

test("a long frame accounts for misses once and stops on the sixth", () => {
  const round = new Round();
  round.resume();
  expect(round.state).toBe("ready");
  round.start();
  round.advance(20000, undefined);
  expect(round.missed).toBe(6);
  expect(round.state).toBe("lost");
  round.advance(5000, undefined);
  expect(round.missed).toBe(6);
  round.start();
  expect(round.state).toBe("playing");
  expect(round.caught).toBe(0);
  expect(round.missed).toBe(0);
  expect(round.banana).toBeUndefined();
});

test("paused time does not advance launch or catch windows", () => {
  const round = new Round();
  round.start();
  round.advance(1000, undefined);
  const banana = round.banana;
  round.pause();
  round.pause();
  round.advance(20000, undefined);
  expect(round.banana).toEqual(banana);
  round.resume();
  round.advance(800, "upper-left");
  expect(round.caught).toBe(1);
});
