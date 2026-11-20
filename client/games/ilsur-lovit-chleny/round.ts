import type { Lane } from "./input.js";
import {
  bananaSequence,
  fallTime,
  floorTime,
  type Banana,
} from "./sequence.js";
export const missLimit = 6;
export const goldenBonus = 20;

export class Round {
  state: "ready" | "playing" | "paused" | "lost" = "ready";
  caught = 0;
  missed = 0;
  score = 0;
  streak = 0;

  get multiplier() {
    if (this.streak >= 20) return 3;
    if (this.streak >= 10) return 2;
    return 1;
  }

  private elapsed = 0;
  private defeatAt = Infinity;
  private sequence: ReturnType<typeof bananaSequence>;
  private pending!: Banana;
  private active: Banana[] = [];

  constructor(private readonly random: () => number = Math.random) {
    this.sequence = bananaSequence(random);
  }

  get bananas() {
    return this.active.map(
      ({ lane, launch, deadline, flight, decoy, golden }) => ({
        decoy,
        golden,
        lane,
        progress: Math.min((this.elapsed - launch) / flight, 1),
        fall: Math.max(0, Math.min((this.elapsed - deadline) / fallTime, 1)),
      }),
    );
  }

  start() {
    this.elapsed = this.caught = this.missed = 0;
    this.score = this.streak = 0;
    this.defeatAt = Infinity;
    this.sequence = bananaSequence(this.random);
    this.pending = this.sequence.next().value;
    this.active = [];
    this.state = "playing";
  }

  pause() {
    if (this.state === "playing") this.state = "paused";
  }

  resume() {
    if (this.state === "paused") this.state = "playing";
  }

  catchBanana(lane: Lane) {
    if (this.state !== "playing" || this.missed >= missLimit) return;
    const index = this.active.findIndex(
      (banana) => banana.lane === lane && this.elapsed < banana.deadline,
    );
    if (index < 0) return;
    const banana = this.active[index]!;
    this.active.splice(index, 1);
    if (banana.decoy) {
      this.recordMiss(this.elapsed);
      return "decoy";
    }
    this.score += 10 * this.multiplier + (banana.golden ? goldenBonus : 0);
    this.streak++;
    this.caught++;
    return {
      progress: (this.elapsed - banana.launch) / banana.flight,
      golden: banana.golden,
    };
  }

  private recordMiss(at: number) {
    this.missed++;
    this.streak = 0;
    if (this.missed === missLimit) this.defeatAt = at + floorTime;
  }

  advance(delta: number) {
    if (this.state !== "playing") return;
    let end = Math.min(this.elapsed + delta, this.defeatAt);
    const remaining: Banana[] = [];
    let index = 0;
    while (index < this.active.length || this.pending.launch <= end) {
      const banana = this.active[index] ?? this.pending;
      if (index < this.active.length) index++;
      else this.pending = this.sequence.next().value;

      const { deadline } = banana;
      const landing = deadline + fallTime;
      if (
        !banana.golden &&
        !banana.decoy &&
        this.missed < missLimit &&
        this.elapsed < landing &&
        landing <= end
      ) {
        this.recordMiss(landing);
        end = Math.min(end, this.defeatAt);
      }
      if (end < landing + floorTime) remaining.push(banana);
    }
    this.active = remaining;
    this.elapsed = end;
    if (end === this.defeatAt) this.state = "lost";
  }
}
