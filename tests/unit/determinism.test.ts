import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("controls wall time, timers and random values", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
  vi.spyOn(Math, "random").mockReturnValue(0.25);
  const callback = vi.fn();
  setTimeout(callback, 500);

  expect(new Date().toISOString()).toBe("2026-01-02T03:04:05.000Z");
  expect(Math.random()).toBe(0.25);
  expect(callback).not.toHaveBeenCalled();

  vi.advanceTimersByTime(500);
  expect(callback).toHaveBeenCalledOnce();
});
