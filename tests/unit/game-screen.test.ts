import { afterEach, expect, test, vi } from "vitest";

class ElementStub extends EventTarget {
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  hidden = false;
  textContent = "";
  inert = false;
  focus = vi.fn();
  setPointerCapture = vi.fn();
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}

async function mount(options: { portrait?: boolean; canvas?: boolean } = {}) {
  vi.resetModules();
  const elements = new Map(
    [
      ".game",
      ".hud",
      ".arena",
      "#pause",
      "#resume",
      "#paused",
      "#rotate",
      "#ready",
      "#lost",
      "#start",
      "#restart",
      "#caught",
      "#misses",
    ].map((selector) => [selector, new ElementStub()]),
  );
  const lane = new ElementStub();
  lane.dataset.lane = "upper-left";
  const drawing = {
    clearRect: vi.fn(),
    setLineDash: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
  };
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    querySelector: (selector: string) =>
      selector === "canvas"
        ? { getContext: () => (options.canvas === false ? null : drawing) }
        : elements.get(selector),
    querySelectorAll: () => [lane],
  });
  const media = Object.assign(new EventTarget(), {
    matches: options.portrait ?? false,
  });
  const window = new EventTarget();
  vi.stubGlobal("document", document);
  vi.stubGlobal("matchMedia", () => media);
  vi.stubGlobal("addEventListener", window.addEventListener.bind(window));
  const frames: FrameRequestCallback[] = [];
  let now = 0;
  vi.stubGlobal("performance", { now: () => now });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    frames.push(callback),
  );
  const el = (selector: string) => elements.get(selector)!;
  const play = () => fire(el("#start"), "click");
  const advance = (delta: number) => {
    now += delta;
    frames.shift()?.(now);
  };
  await import("../../client/game/main.js");
  return {
    elements,
    lane,
    document,
    media,
    window,
    drawing,
    play,
    el,
    advance,
    frames,
  };
}

function fire(target: EventTarget, type: string, fields = {}) {
  const event = Object.assign(new Event(type, { cancelable: true }), fields);
  target.dispatchEvent(event);
  return event;
}

afterEach(() => vi.unstubAllGlobals());

test("keyboard and pointer navigation share the same displayed position", async () => {
  const { elements, lane, window, drawing, play } = await mount();
  play();
  const game = elements.get(".game")!;
  expect(game.dataset.position).toBe("center");
  expect(drawing.fillText).toHaveBeenLastCalledWith("🐓", 600, 270);
  for (const [code, modifiers] of [
    ["KeyX", {}],
    ["KeyQ", { ctrlKey: true }],
    ["KeyQ", { altKey: true }],
    ["KeyQ", { metaKey: true }],
  ] as const) {
    expect(
      fire(window, "keydown", { code, ...modifiers }).defaultPrevented,
    ).toBe(false);
  }
  fire(window, "keydown", { code: "KeyO" });
  expect(game.dataset.position).toBe("upper-right");
  fire(window, "keydown", { code: "KeyQ", repeat: true });
  expect(game.dataset.position).toBe("upper-right");
  fire(lane, "pointerdown", { button: 2, pointerId: 1 });
  expect(lane.setPointerCapture).not.toHaveBeenCalled();
  fire(lane, "pointerdown", { button: 0, pointerId: 1 });
  expect(lane.setPointerCapture).toHaveBeenCalledWith(1);
  expect(lane.attributes.get("aria-pressed")).toBe("true");
  expect(drawing.fillText).toHaveBeenLastCalledWith("🐓", 420, 160);
  fire(lane, "pointerup", { pointerId: 1 });
  expect(game.dataset.position).toBe("upper-right");
  fire(window, "keyup", { code: "KeyO" });
  expect(game.dataset.position).toBe("center");
  expect(fire(lane, "keydown", { code: "KeyQ" }).defaultPrevented).toBe(false);
  for (const code of ["Space", "Enter"]) {
    expect(fire(lane, "keydown", { code }).defaultPrevented).toBe(true);
    expect(game.dataset.position).toBe("upper-left");
    fire(lane, "keydown", { code, repeat: true });
    expect(game.dataset.position).toBe("upper-left");
    fire(window, "keyup", { code });
    expect(game.dataset.position).toBe("center");
  }
});

test("manual pause and automatic pause clear input and restore focus", async () => {
  const { elements, document, window, play } = await mount();
  play();
  const pause = elements.get("#pause")!;
  const resume = elements.get("#resume")!;
  const overlay = elements.get("#paused")!;
  fire(window, "keydown", { code: "Escape", repeat: true });
  expect(overlay.hidden).toBe(true);
  fire(pause, "click");
  expect(overlay.hidden).toBe(false);
  expect(resume.focus).toHaveBeenCalled();
  expect(elements.get(".arena")!.inert).toBe(true);
  fire(resume, "click");
  expect(pause.focus).toHaveBeenCalled();
  fire(document, "visibilitychange");
  expect(overlay.hidden).toBe(true);
  document.hidden = true;
  fire(document, "visibilitychange");
  fire(window, "keydown", { code: "Escape" });
  expect(overlay.hidden).toBe(false);
  document.hidden = false;
  fire(window, "keydown", { code: "Escape" });
  expect(overlay.hidden).toBe(true);
  fire(window, "keydown", { code: "KeyQ" });
  fire(window, "blur");
  expect(overlay.hidden).toBe(false);
  expect(elements.get(".game")!.dataset.position).toBe("center");
});

test("portrait holds the screen paused until the player resumes in landscape", async () => {
  const { elements, media, window, play, el } = await mount({
    portrait: true,
    canvas: false,
  });
  const rotate = elements.get("#rotate")!;
  const overlay = elements.get("#paused")!;
  const resume = elements.get("#resume")!;
  expect(rotate.hidden).toBe(false);
  play();
  fire(window, "keydown", { code: "Escape" });
  expect(overlay.hidden).toBe(true);
  media.matches = false;
  fire(media, "change");
  expect(rotate.hidden).toBe(true);
  expect(overlay.hidden).toBe(true);
  expect(el("#start").focus).toHaveBeenCalledOnce();
  play();
  media.matches = true;
  fire(media, "change");
  media.matches = false;
  fire(media, "change");
  expect(overlay.hidden).toBe(false);
  expect(resume.focus).toHaveBeenCalledOnce();
  fire(resume, "click");
  expect(overlay.hidden).toBe(true);
  media.matches = true;
  fire(media, "change");
  expect(rotate.hidden).toBe(false);
});

test("the animation loop survives pause and restart with only one pending frame", async () => {
  const { el, play, advance, frames, drawing, document, media } = await mount();
  const game = el(".game");
  expect(game.dataset.state).toBe("ready");
  document.hidden = true;
  play();
  expect(frames).toHaveLength(0);
  document.hidden = false;
  play();
  play();
  expect(frames).toHaveLength(1);
  advance(500);
  expect(drawing.fillText).toHaveBeenLastCalledWith("🍌", 172, 68);
  fire(el("#pause"), "click");
  fire(el("#resume"), "click");
  expect(frames).toHaveLength(1);
  fire(el("#pause"), "click");
  advance(30000);
  expect(frames).toHaveLength(0);
  expect(el("#misses").textContent).toBe("0 / 6");
  fire(el("#resume"), "click");
  advance(2270);
  const dropY = 160 + (518 - 160) * 0.5 ** 2;
  expect(drawing.fillText).toHaveBeenLastCalledWith("🍌", 420, dropY);
  expect(el("#misses").textContent).toBe("0 / 6");
  advance(170);
  expect(drawing.fillText).toHaveBeenLastCalledWith("🍌", 420, 518);
  expect(el("#misses").textContent).toBe("1 / 6");
  advance(15000);
  expect(game.dataset.state).toBe("lost");
  expect(el("#restart").focus).toHaveBeenCalled();
  expect(frames).toHaveLength(0);
  fire(media, "change");
  fire(el("#restart"), "click");
  expect(game.dataset.state).toBe("playing");
  expect(el("#misses").textContent).toBe("0 / 6");
  expect(el("#caught").textContent).toBe("0");
  expect(frames).toHaveLength(1);
});

test("holding a key and its auto-repeat cannot catch a second banana from the same cannon", async () => {
  vi.stubGlobal("Math", Object.create(Math, { random: { value: () => 0 } }));
  const { el, play, advance, window, lane } = await mount();
  play();
  fire(window, "keydown", { code: "KeyQ" });
  advance(500);
  expect(el("#caught").textContent).toBe("0");
  fire(window, "keyup", { code: "KeyQ" });

  const keys = ["KeyQ", "KeyA", "KeyO", "KeyL"];
  for (let index = 0; index < 16; index++) {
    if (index > 0) advance(2800);
    const code = keys[index % 4];
    fire(window, "keydown", { code });
    fire(window, "keyup", { code });
  }
  advance(4000);
  fire(window, "keydown", { code: "KeyQ" });
  expect(el("#caught").textContent).toBe("17");
  advance(100);
  fire(window, "keydown", { code: "KeyQ", repeat: true });
  expect(el("#caught").textContent).toBe("17");
  fire(window, "keyup", { code: "KeyQ" });
  fire(lane, "pointerdown", { button: 0, pointerId: 8 });
  fire(lane, "pointerup", { button: 0, pointerId: 8 });
  expect(el("#caught").textContent).toBe("18");
});
