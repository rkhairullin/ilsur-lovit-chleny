export const lanes = [
  "upper-left",
  "lower-left",
  "upper-right",
  "lower-right",
] as const;
export type Lane = (typeof lanes)[number];

const keys = new Map<string, Lane>([
  ["KeyQ", "upper-left"],
  ["KeyA", "lower-left"],
  ["KeyO", "upper-right"],
  ["KeyL", "lower-right"],
]);

export function laneForKey(code: string) {
  return keys.get(code);
}

export class GameInput {
  private held = new Map<string, Lane>();
  paused = false;

  get lane() {
    return Array.from(this.held.values()).at(-1);
  }

  press(source: string, lane: Lane) {
    if (!this.paused && !this.held.has(source)) this.held.set(source, lane);
  }

  release(source: string) {
    this.held.delete(source);
  }

  pause() {
    this.paused = true;
    this.held.clear();
  }

  resume(blocked: boolean) {
    if (!blocked) this.paused = false;
  }
}
