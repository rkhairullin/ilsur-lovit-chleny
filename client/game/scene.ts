import { lanes, type Lane } from "./input.js";

const ends = [
  { x: 420, y: 160, color: "#ff77c8" },
  { x: 420, y: 380, color: "#ffc56c" },
  { x: 780, y: 160, color: "#78eefa" },
  { x: 780, y: 380, color: "#b697ff" },
];

export function drawScene(
  ctx: CanvasRenderingContext2D,
  lane: Lane | undefined,
) {
  ctx.clearRect(0, 0, 1200, 540);
  for (const [index, end] of ends.entries()) {
    const active = lanes[index] === lane;
    ctx.strokeStyle = end.color;
    ctx.lineWidth = active ? 7 : 3;
    ctx.setLineDash(active ? [] : [10, 12]);
    ctx.beginPath();
    ctx.moveTo(index < 2 ? 172 : 1028, end.y < 270 ? 68 : 472);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.fillStyle = end.color;
    ctx.beginPath();
    ctx.arc(end.x, end.y, active ? 34 : 11, 0, Math.PI * 2);
    ctx.fill();
  }

  const position =
    lane === undefined ? { x: 600, y: 270 } : ends[lanes.indexOf(lane)]!;
  ctx.fillStyle = "#511745";
  ctx.beginPath();
  ctx.arc(position.x, position.y, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "42px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🐓", position.x, position.y);
}
