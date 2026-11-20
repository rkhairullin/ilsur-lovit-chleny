import { lanes, type Lane } from "./input.js";

const stageDuration = 45_000;
const switchTime = 400;
const firstDecoyAt = 30_000;
const minDecoyInterval = 6000;
const goldenStartsAt = 60_000;
const regularsBetweenGolden = 20;
export const fallTime = 340;
export const floorTime = 160;

// Flight durations keep four bananas possible at the final launch interval.
const stages = [
  { interval: 2800, flight: 2100 },
  { interval: 1200, flight: 1500 },
  { interval: 600, flight: 1240 },
  { interval: 400, flight: 1220 },
] as const;

function stageAt(time: number) {
  return stages[Math.min(Math.floor(time / stageDuration), stages.length - 1)]!;
}

export type Banana = {
  launch: number;
  deadline: number;
  flight: number;
  lane: Lane;
  decoy: boolean;
  golden: boolean;
};

export function* bananaSequence(
  random: () => number,
): Generator<Banana, never> {
  let launch = 500;
  let earliestDecoy = firstDecoyAt;
  let regularsUntilDecoy = 0;
  let regularsUntilGolden = 0;
  while (true) {
    const { interval, flight } = stageAt(launch);
    const laneIndex = Math.floor(random() * lanes.length);
    const deadline = launch + flight;
    const decoy = launch >= earliestDecoy && regularsUntilDecoy === 0;
    const golden =
      !decoy && launch >= goldenStartsAt && regularsUntilGolden === 0;
    if (decoy) {
      earliestDecoy = launch + minDecoyInterval;
      regularsUntilDecoy = 8 + Math.floor(random() * 5);
    } else if (golden) {
      regularsUntilGolden = regularsBetweenGolden;
    } else {
      regularsUntilGolden = Math.max(0, regularsUntilGolden - 1);
      regularsUntilDecoy = Math.max(0, regularsUntilDecoy - 1);
    }
    yield { launch, deadline, flight, lane: lanes[laneIndex]!, decoy, golden };
    const nextLaunch = launch + interval;
    const isolate = launch < firstDecoyAt && nextLaunch >= firstDecoyAt;
    launch = Math.max(
      nextLaunch,
      deadline + switchTime - stageAt(nextLaunch).flight,
      isolate ? deadline + fallTime + floorTime : 0,
    );
  }
}
