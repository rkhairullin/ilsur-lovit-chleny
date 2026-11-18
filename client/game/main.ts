import { GameInput, laneForKey, type Lane } from "./input.js";
import { drawScene } from "./scene.js";

const game = document.querySelector<HTMLElement>(".game")!;
const hud = document.querySelector<HTMLElement>(".hud")!;
const arena = document.querySelector<HTMLElement>(".arena")!;
const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d");
const pause = document.querySelector<HTMLButtonElement>("#pause")!;
const resume = document.querySelector<HTMLButtonElement>("#resume")!;
const paused = document.querySelector<HTMLElement>("#paused")!;
const rotate = document.querySelector<HTMLElement>("#rotate")!;
const controls = document.querySelectorAll<HTMLButtonElement>("[data-lane]");
const portraitPhone = matchMedia(
  "(orientation: portrait) and (any-pointer: coarse), (orientation: portrait) and (max-width: 600px)",
);
const input = new GameInput();

function render() {
  const lane = input.lane;
  game.dataset.position = lane ?? "center";
  for (const button of controls) {
    button.setAttribute("aria-pressed", String(button.dataset.lane === lane));
  }
  if (ctx) drawScene(ctx, lane);

  const needsRotation = portraitPhone.matches;
  const showPause = input.paused && !needsRotation;
  rotate.hidden = !needsRotation;
  paused.hidden = !showPause;
  hud.inert = input.paused;
  arena.inert = input.paused;
}

function stop() {
  input.pause();
  render();
  if (!paused.hidden) resume.focus();
}

function togglePause() {
  if (input.paused) {
    input.resume(document.hidden || portraitPhone.matches);
    render();
    if (!input.paused) pause.focus();
  } else {
    stop();
  }
}

function rotateScreen() {
  if (portraitPhone.matches) stop();
  else {
    render();
    if (!paused.hidden) resume.focus();
  }
}

addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    event.preventDefault();
    if (!event.repeat) togglePause();
    return;
  }
  const lane = laneForKey(event.code);
  if (!lane || event.ctrlKey || event.altKey || event.metaKey) return;
  event.preventDefault();
  if (!event.repeat) {
    input.press(event.code, lane);
    render();
  }
});

addEventListener("keyup", (event) => {
  input.release(event.code);
  render();
});

for (const button of controls) {
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    button.setPointerCapture(event.pointerId);
    input.press(String(event.pointerId), button.dataset.lane as Lane);
    render();
  });

  for (const type of [
    "pointerup",
    "pointercancel",
    "lostpointercapture",
  ] as const) {
    button.addEventListener(type, (event) => {
      input.release(String(event.pointerId));
      render();
    });
  }

  button.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.code !== "Enter") return;
    event.preventDefault();
    input.press(event.code, button.dataset.lane as Lane);
    render();
  });
}

pause.addEventListener("click", togglePause);
resume.addEventListener("click", togglePause);
addEventListener("blur", stop);
portraitPhone.addEventListener("change", rotateScreen);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
});
rotateScreen();
