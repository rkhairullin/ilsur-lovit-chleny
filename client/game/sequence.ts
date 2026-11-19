import { lanes, type Lane } from "./input.js";

const stageDuration = 45_000;
const switchTime = 400;

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
};

export function* bananaSequence(
  random: () => number,
): Generator<Banana, never> {
  let launch = 500;
  while (true) {
    const { interval, flight } = stageAt(launch);
    const laneIndex = Math.floor(random() * lanes.length);
    const deadline = launch + flight;
    yield { launch, deadline, flight, lane: lanes[laneIndex]! };
    const nextLaunch = launch + interval;
    launch = Math.max(
      nextLaunch,
      deadline + switchTime - stageAt(nextLaunch).flight,
    );
  }
}
