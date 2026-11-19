import { GameInput, laneForKey, type Lane } from "./input.js";
import { Round, missLimit } from "./round.js";
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
input.pause();
const round = new Round();
const ready = document.querySelector<HTMLElement>("#ready")!;
const lost = document.querySelector<HTMLElement>("#lost")!;
const start = document.querySelector<HTMLButtonElement>("#start")!;
const restart = document.querySelector<HTMLButtonElement>("#restart")!;
const caught = document.querySelector<HTMLElement>("#caught")!;
const misses = document.querySelector<HTMLElement>("#misses")!;
const score = document.querySelector<HTMLElement>("#score")!;
const streak = document.querySelector<HTMLElement>("#streak")!;
const multiplier = document.querySelector<HTMLElement>("#multiplier")!;
const finalScore = document.querySelector<HTMLElement>("#final-score")!;
let previousTime = 0;
let framePending = false;

function render() {
  const lane = input.lane;
  game.dataset.position = lane ?? "center";
  for (const button of controls) {
    button.setAttribute("aria-pressed", String(button.dataset.lane === lane));
  }
  if (ctx) drawScene(ctx, lane, round.state === "lost" ? [] : round.bananas);

  game.dataset.state = round.state;
  caught.textContent = String(round.caught);
  score.textContent = finalScore.textContent = String(round.score);
  streak.textContent = String(round.streak);
  multiplier.textContent = `×${round.multiplier}`;
  misses.textContent = `${round.missed} / ${missLimit}`;

  const needsRotation = portraitPhone.matches;
  rotate.hidden = !needsRotation;
  ready.hidden = needsRotation || round.state !== "ready";
  paused.hidden = needsRotation || round.state !== "paused";
  lost.hidden = needsRotation || round.state !== "lost";
  hud.inert = arena.inert = needsRotation || round.state !== "playing";
}

function update() {
  if (round.state !== "playing") return;
  const now = performance.now();
  round.advance(now - previousTime);
  previousTime = now;
  if (gameHasEnded()) {
    input.pause();
    render();
    restart.focus();
  }
}

function gameHasEnded() {
  return round.state === "lost";
}

function scheduleFrame() {
  if (framePending || round.state !== "playing") return;
  framePending = true;
  requestAnimationFrame(() => {
    framePending = false;
    update();
    render();
    scheduleFrame();
  });
}

function begin() {
  if (document.hidden || portraitPhone.matches || round.state === "playing")
    return;
  round.start();
  continuePlay();
}

function continuePlay() {
  input.resume(false);
  previousTime = performance.now();
  render();
  pause.focus();
  scheduleFrame();
}

function press(source: string, lane: Lane) {
  update();
  if (input.press(source, lane)) round.catchBanana(lane);
  render();
}

function stop() {
  round.pause();
  input.pause();
  render();
  if (!paused.hidden) resume.focus();
}

function togglePause() {
  if (round.state === "paused") {
    if (document.hidden || portraitPhone.matches) return;
    round.resume();
    continuePlay();
  } else {
    update();
    stop();
  }
}

function rotateScreen() {
  if (portraitPhone.matches) stop();
  else {
    render();
    if (!paused.hidden) resume.focus();
    if (!ready.hidden) start.focus();
    if (!lost.hidden) restart.focus();
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
    press(event.code, lane);
  }
});

addEventListener("keyup", (event) => {
  update();
  input.release(event.code);
  render();
});

for (const button of controls) {
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    button.setPointerCapture(event.pointerId);
    press(String(event.pointerId), button.dataset.lane as Lane);
  });

  for (const type of [
    "pointerup",
    "pointercancel",
    "lostpointercapture",
  ] as const) {
    button.addEventListener(type, (event) => {
      update();
      input.release(String(event.pointerId));
      render();
    });
  }

  button.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.code !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) press(event.code, button.dataset.lane as Lane);
  });
}

start.addEventListener("click", begin);
restart.addEventListener("click", begin);
pause.addEventListener("click", togglePause);
resume.addEventListener("click", togglePause);
addEventListener("blur", stop);
portraitPhone.addEventListener("change", rotateScreen);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
});
rotateScreen();
