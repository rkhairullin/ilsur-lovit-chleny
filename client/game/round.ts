import { lanes, type Lane } from "./input.js";

const launchInterval = 1800;
const flightTime = 1300;
const fallTime = 340;
export const missLimit = 6;

export class Round {
  state: "ready" | "playing" | "paused" | "lost" = "ready";
  caught = 0;
  missed = 0;
  private elapsed = 0;
  private item = 0;

  get banana() {
    const age = this.elapsed - this.launchTime;
    if (age < 0) return undefined;
    return {
      lane: this.lane,
      progress: Math.min(age / flightTime, 1),
      fall: Math.max(0, Math.min((age - flightTime) / fallTime, 1)),
    };
  }

  private get launchTime() {
    return 500 + this.item * launchInterval;
  }

  private get lane() {
    return lanes[this.item % lanes.length]!;
  }

  start() {
    this.elapsed = this.item = this.caught = this.missed = 0;
    this.state = "playing";
  }

  pause() {
    if (this.state === "playing") this.state = "paused";
  }

  resume() {
    if (this.state === "paused") this.state = "playing";
  }

  advance(delta: number, lane: Lane | undefined) {
    if (this.state !== "playing") return;
    const end = this.elapsed + delta;
    while (this.state === "playing") {
      const launch = this.launchTime;
      const fall = launch + flightTime;
      const landing = fall + fallTime;
      if (end >= launch && this.elapsed < fall && lane === this.lane) {
        this.caught++;
      } else {
        if (end < landing) break;
        if (this.elapsed < landing) this.missed++;
        // Leave the banana on the floor briefly, including on the final miss.
        if (end < launch + launchInterval) break;
        if (this.missed === missLimit) this.state = "lost";
      }
      this.item++;
    }
    this.elapsed = end;
  }
}
