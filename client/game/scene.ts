import { lanes, type Lane } from "./input.js";
import type { Round } from "./round.js";
import type { Reaction } from "./sound.js";

const floorY = 518;

const starts = [
  { x: 172, y: 68 },
  { x: 172, y: 472 },
  { x: 1028, y: 68 },
  { x: 1028, y: 472 },
];

const ends = [
  { x: 420, y: 160, color: "#ff77c8" },
  { x: 420, y: 380, color: "#ffc56c" },
  { x: 780, y: 160, color: "#78eefa" },
  { x: 780, y: 380, color: "#b697ff" },
];

export function drawScene(
  ctx: CanvasRenderingContext2D,
  lane: Lane | undefined,
  bananas: Round["bananas"],
  hero: HTMLImageElement,
  bananaSprite: HTMLImageElement,
  cannonSprite: HTMLImageElement,
  reaction: Reaction | undefined,
  compactLandscape: boolean,
  swallowing?: { from: number; progress: number },
) {
  ctx.clearRect(0, 0, 1200, 540);
  for (const [index, end] of ends.entries()) {
    const active = lanes[index] === lane;
    ctx.strokeStyle = end.color;
    ctx.lineWidth = active ? 7 : 3;
    ctx.setLineDash(active ? [] : [10, 12]);
    ctx.beginPath();
    const start = starts[index]!;
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    if (!active) {
      ctx.fillStyle = end.color;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    drawCannon(ctx, cannonSprite, start, end);
  }

  const position =
    lane === undefined ? { x: 600, y: 270 } : ends[lanes.indexOf(lane)]!;
  ctx.font = "42px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (hero.naturalWidth) {
    ctx.save();
    ctx.translate(position.x, position.y);
    if (lane === "upper-left" || lane === "lower-left") ctx.scale(-1, 1);
    if (lane === "lower-left" || lane === "lower-right") ctx.rotate(0.22);
    const heroSize = reaction === "catch" ? 168 : 156;
    const size = heroSize * (compactLandscape ? 1.5 : 1);
    // The mouth is at (72%, 24.5%) in the source portrait.
    drawSprite(ctx, hero, "🐓", 0, 0, size, lane ? [0.72, 0.245] : undefined);
    ctx.restore();
  } else {
    ctx.fillText("🐓", position.x, position.y);
  }
  if (swallowing && lane) {
    const start = starts[lanes.indexOf(lane)]!;
    const progress =
      swallowing.from + (1 - swallowing.from) * swallowing.progress;
    if (bananaSprite.naturalWidth) {
      drawSprite(
        ctx,
        bananaSprite,
        "🍌",
        start.x + (position.x - start.x) * progress,
        start.y + (position.y - start.y) * progress,
        56 * (1 - swallowing.progress),
      );
    }
  }
  for (const banana of bananas) {
    const index = lanes.indexOf(banana.lane);
    const end = ends[index]!;
    const { x, y } = starts[index]!;
    drawSprite(
      ctx,
      bananaSprite,
      "🍌",
      x + (end.x - x) * banana.progress,
      y + (end.y - y) * banana.progress + (floorY - end.y) * banana.fall ** 2,
      60,
    );
  }
}

function drawCannon(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  start: { x: number; y: number },
  end: { x: number; y: number; color: string },
) {
  const direction = Math.sign(end.x - start.x);
  if (!image.naturalWidth) {
    ctx.setLineDash([]);
    ctx.strokeStyle = "#1c0c35";
    ctx.lineWidth = 44;
    ctx.beginPath();
    ctx.moveTo(start.x - direction * 54, start.y);
    ctx.lineTo(start.x, start.y);
    ctx.stroke();
    ctx.strokeStyle = end.color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 23, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  const width = 108;
  const height = (width * image.naturalHeight) / image.naturalWidth;
  ctx.save();
  ctx.translate(start.x, start.y);
  ctx.scale(direction, 1);
  ctx.rotate(Math.atan2(end.y - start.y, Math.abs(end.x - start.x)));
  ctx.drawImage(image, -width * 0.85, -height / 2, width, height);
  ctx.restore();
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  fallback: string,
  x: number,
  y: number,
  size: number,
  [anchorX, anchorY] = [0.5, 0.5],
) {
  if (!image.naturalWidth) {
    ctx.fillText(fallback, x, y);
    return;
  }

  const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(
    image,
    x - width * anchorX,
    y - height * anchorY,
    width,
    height,
  );
}
