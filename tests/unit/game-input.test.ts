import { describe, expect, it } from "vitest";
import { GameInput, laneForKey } from "../../client/game/input.js";

describe("game input", () => {
  it("maps the four physical keys and ignores unrelated keys", () => {
    expect(["KeyQ", "KeyA", "KeyO", "KeyL", "KeyP"].map(laneForKey)).toEqual([
      "upper-left",
      "lower-left",
      "upper-right",
      "lower-right",
      undefined,
    ]);
  });

  it("gives the newest held input priority and restores the previous one when released", () => {
    const input = new GameInput();
    input.press("KeyQ", "upper-left");
    input.press("1", "lower-right");
    input.press("KeyQ", "upper-left");
    expect(input.lane).toBe("lower-right");
    input.release("2");
    expect(input.lane).toBe("lower-right");
    input.release("1");
    expect(input.lane).toBe("upper-left");
    input.release("KeyQ");
    expect(input.lane).toBeUndefined();
  });

  it("clears held positions on pause and resumes only when allowed", () => {
    const input = new GameInput();
    input.press("KeyA", "lower-left");
    input.pause();
    expect(input.lane).toBeUndefined();
    input.resume(true);
    input.press("KeyO", "upper-right");
    expect(input.paused).toBe(true);
    expect(input.lane).toBeUndefined();
    input.resume(false);
    input.press("KeyO", "upper-right");
    expect(input.paused).toBe(false);
    expect(input.lane).toBe("upper-right");
  });
});
