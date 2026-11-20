import { GameInput, laneForKey, type Lane } from "./input.js";
import { Round, goldenBonus, missLimit } from "./round.js";
import { drawScene } from "./scene.js";
import { GameSound, type Reaction } from "./sound.js";

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
const compactLandscape = matchMedia(
  "(orientation: landscape) and (max-height: 500px)",
);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
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
const hero = document.querySelector<HTMLImageElement>("#hero-sprite")!;
const bananaSprite =
  document.querySelector<HTMLImageElement>("#banana-sprite")!;
const goldenSprite =
  document.querySelector<HTMLImageElement>("#golden-sprite")!;
const decoySprite = document.querySelector<HTMLImageElement>("#decoy-sprite")!;
const cannonSprite =
  document.querySelector<HTMLImageElement>("#cannon-sprite")!;
const reaction = document.querySelector<HTMLElement>("#reaction")!;
const soundButton = document.querySelector<HTMLButtonElement>("#sound")!;
const sound = new GameSound(soundButton);
const reactionText = {
  catch: "Отсосал",
  miss: "Лох! Пидр!",
  defeat: "Gay over",
};
let lastReaction: Reaction | undefined;
const swallowDuration = 160;
let swallow:
  { lane: Lane; from: number; started: number; golden: boolean } | undefined;
let reactionUntil = 0;
let previousTime = 0;
let framePending = false;

function render() {
  const lane = input.lane;
  game.dataset.position = lane ?? "center";
  for (const button of controls) {
    button.setAttribute("aria-pressed", String(button.dataset.lane === lane));
  }
  const swallowProgress = swallow
    ? (previousTime - swallow.started) / swallowDuration
    : 1;
  const swallowing =
    swallow &&
    swallowProgress < 1 &&
    !reducedMotion.matches &&
    (lane === undefined || lane === swallow.lane)
      ? swallow
      : undefined;
  if (ctx) {
    const unit = Math.max(
      1,
      Math.round(
        Math.min(canvas.clientWidth / 20, canvas.clientHeight / 9) *
          devicePixelRatio,
      ),
    );
    if (canvas.width !== unit * 20) {
      canvas.width = unit * 20;
      canvas.height = unit * 9;
    }
    const scale = unit / 60;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawScene(
      ctx,
      swallowing?.lane ?? lane,
      round.state === "lost" ? [] : round.bananas,
      hero,
      bananaSprite,
      decoySprite,
      goldenSprite,
      cannonSprite,
      lastReaction,
      compactLandscape.matches,
      swallowing && {
        from: swallowing.from,
        progress: swallowProgress,
        golden: swallowing.golden,
      },
    );
  }

  game.dataset.state = round.state;
  caught.textContent = String(round.caught);
  score.textContent = finalScore.textContent = String(round.score);
  streak.textContent = String(round.streak);
  multiplier.textContent = `×${round.multiplier}`;
  misses.textContent = `${round.missed} / ${missLimit}`;

  const needsRotation = portraitPhone.matches;
  rotate.hidden = !needsRotation;
  soundButton.hidden = needsRotation;
  ready.hidden = needsRotation || round.state !== "ready";
  paused.hidden = needsRotation || round.state !== "paused";
  lost.hidden = needsRotation || round.state !== "lost";
  hud.inert = arena.inert = needsRotation || round.state !== "playing";
}

function update() {
  if (round.state !== "playing") return;
  const now = performance.now();
  const previousMisses = round.missed;
  round.advance(now - previousTime);
  previousTime = now;
  if (lastReaction && now >= reactionUntil) clearReaction();
  if (gameHasEnded()) {
    react("defeat");
    input.pause();
    render();
    restart.focus();
  } else if (round.missed > previousMisses) {
    react("miss");
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
  swallow = undefined;
  clearReaction();
  continuePlay();
}

function continuePlay() {
  sound.activate();
  input.resume(false);
  previousTime = performance.now();
  render();
  pause.focus();
  scheduleFrame();
}

function press(source: string, lane: Lane) {
  update();
  if (input.press(source, lane)) {
    const progress = round.catchBanana(lane);
    if (progress === "decoy") {
      swallow = undefined;
      react("miss");
    } else if (progress) {
      swallow = {
        lane,
        from: progress.progress,
        started: previousTime,
        golden: progress.golden,
      };
      if (progress.golden) react("catch", `Бонус +${goldenBonus}`);
      else react("catch");
    } else if (swallow?.lane !== lane) {
      swallow = undefined;
    }
  }
  render();
}

function clearReaction() {
  lastReaction = undefined;
  delete reaction.dataset.reaction;
  reaction.textContent = "";
}

function react(kind: Reaction, text = reactionText[kind]) {
  lastReaction = kind;
  reactionUntil = previousTime + 750;
  reaction.dataset.reaction = kind;
  reaction.textContent = text;
  sound.play(kind);
}

function stop() {
  swallow = undefined;
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
compactLandscape.addEventListener("change", render);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
});
hero.addEventListener("load", render);
bananaSprite.addEventListener("load", render);
decoySprite.addEventListener("load", render);
goldenSprite.addEventListener("load", render);
cannonSprite.addEventListener("load", render);
new ResizeObserver(render).observe(canvas);
rotateScreen();
