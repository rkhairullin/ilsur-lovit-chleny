import { afterEach, expect, test, vi } from "vitest";
import { GameSound } from "../../client/games/ilsur-lovit-chleny/sound.js";

function setup(stored: string | null = null) {
  const button = Object.assign(new EventTarget(), { setAttribute: vi.fn() });
  const storage = {
    getItem: vi.fn(() => stored),
    setItem: vi.fn(),
  };
  const gain = {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };
  const oscillator = {
    frequency: { value: 0 },
    connect: vi.fn(() => gain),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const audio = {
    state: "running",
    destination: {},
    currentTime: 3,
    createGain: vi.fn(() => gain),
    createOscillator: vi.fn(() => oscillator),
    resume: vi.fn(async () => {}),
  };
  const context = vi.fn(function () {
    return audio;
  });
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("AudioContext", context);
  const sound = new GameSound(button as unknown as HTMLButtonElement);
  const toggle = () => button.dispatchEvent(new Event("click"));
  return { button, sound, storage, gain, oscillator, audio, context, toggle };
}

afterEach(() => vi.unstubAllGlobals());

test("opens sound only after activation, respects suspension and plays distinct cues", () => {
  const { sound, context, audio, oscillator } = setup();
  sound.play("catch");
  expect(context).not.toHaveBeenCalled();
  sound.activate();
  audio.state = "suspended";
  sound.play("miss");
  expect(audio.createOscillator).not.toHaveBeenCalled();
  audio.state = "running";
  for (const [cue, count, lastNote] of [
    ["catch", 2, 880],
    ["miss", 2, 196],
    ["defeat", 3, 175],
  ] as const) {
    oscillator.start.mockClear();
    sound.play(cue);
    expect(oscillator.start).toHaveBeenCalledTimes(count);
    expect(oscillator.frequency.value).toBe(lastNote);
  }
  sound.activate();
  expect(context).toHaveBeenCalledTimes(1);
  expect(audio.resume).toHaveBeenCalledTimes(2);
});

test("reads and writes mute, immediately silences active cues, and reuses audio", () => {
  const { button, sound, context, storage, gain, audio, toggle } = setup("off");
  expect(button.setAttribute).toHaveBeenLastCalledWith("aria-pressed", "false");
  sound.activate();
  expect(context).not.toHaveBeenCalled();
  toggle();
  expect(storage.setItem).toHaveBeenLastCalledWith("ilsur-arcade-sound", "on");
  sound.play("catch");
  const count = audio.createOscillator.mock.calls.length;
  toggle();
  expect(gain.gain.value).toBe(0);
  sound.play("miss");
  expect(audio.createOscillator).toHaveBeenCalledTimes(count);
  expect(storage.setItem).toHaveBeenLastCalledWith("ilsur-arcade-sound", "off");
  toggle();
  expect(gain.gain.value).toBe(1);
  expect(context).toHaveBeenCalledTimes(1);
});

test("blocked storage, unavailable audio and failed resume do not block the game", async () => {
  const { storage, context, audio } = setup();
  const button = Object.assign(new EventTarget(), { setAttribute: vi.fn() });
  storage.getItem.mockImplementation(() => {
    throw Error("blocked");
  });
  storage.setItem.mockImplementation(() => {
    throw Error("blocked");
  });
  context.mockImplementationOnce(() => {
    throw Error("unavailable");
  });
  audio.resume.mockRejectedValueOnce(Error("blocked"));
  const sound = new GameSound(button as unknown as HTMLButtonElement);
  expect(() => sound.activate()).not.toThrow();
  expect(() => sound.activate()).not.toThrow();
  await Promise.resolve();
  expect(() => button.dispatchEvent(new Event("click"))).not.toThrow();
  expect(button.setAttribute).toHaveBeenLastCalledWith("aria-pressed", "false");
});
