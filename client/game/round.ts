import type { Lane } from "./input.js";
import { bananaSequence, type Banana } from "./sequence.js";

const fallTime = 340;
const floorTime = 160;
export const missLimit = 6;

export class Round {
  state: "ready" | "playing" | "paused" | "lost" = "ready";
  caught = 0;
  missed = 0;
  private elapsed = 0;
  private defeatAt = Infinity;
  private sequence: ReturnType<typeof bananaSequence>;
  private pending!: Banana;
  private active: Banana[] = [];

  constructor(private readonly random: () => number = Math.random) {
    this.sequence = bananaSequence(random);
  }

  get bananas() {
    return this.active.map(({ lane, launch, deadline, flight }) => ({
      lane,
      progress: Math.min((this.elapsed - launch) / flight, 1),
      fall: Math.max(0, Math.min((this.elapsed - deadline) / fallTime, 1)),
    }));
  }

  start() {
    this.elapsed = this.caught = this.missed = 0;
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
    if (this.state !== "playing") return;
    const index = this.active.findIndex(
      (banana) => banana.lane === lane && this.elapsed < banana.deadline,
    );
    if (index < 0) return;
    this.active.splice(index, 1);
    this.caught++;
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
      if (this.elapsed < landing && landing <= end) {
        this.missed++;
        if (this.missed === missLimit) {
          this.defeatAt = landing + floorTime;
          end = Math.min(end, this.defeatAt);
        }
      }
      if (end < landing + floorTime) remaining.push(banana);
    }
    this.active = remaining;
    this.elapsed = end;
    if (end === this.defeatAt) this.state = "lost";
  }
}
