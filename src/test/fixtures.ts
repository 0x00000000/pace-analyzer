import type { TrackData } from "../models/route";

// One step of a hand-built run: time and distance since the previous point.
export type Step = {
    deltaTime: number;
    deltaDistance: number;
    type?: string;
    deltaPause?: number;
};

// Builds the JSON string of a Runkeeper-shaped activity from the given steps. A StartPoint is
// added first. Each step moves the position a little to the north-east.
export function makeRun(steps: Step[]): string {
    let timestamp = 0;
    const points = [{ deltaTime: 0, deltaDistance: 0, type: "StartPoint" }, ...steps].map((step, i) => {
        timestamp += step.deltaTime + (step.deltaPause ?? 0);
        return {
            accuracy: 3.79,
            altitude: 56,
            deltaDistance: step.deltaDistance,
            deltaPause: step.deltaPause ?? 0,
            deltaTime: step.deltaTime,
            latitude: 52.396 + i * 0.00001,
            longitude: 9.7396 + i * 0.00001,
            timestamp,
            type: step.type ?? "TripPoint",
        };
    });
    return JSON.stringify({ activityType: "RUN", points });
}

// `count` steps of `deltaTime` ms and `deltaDistance` m each.
export function steady(count: number, deltaTime = 1000, deltaDistance = 3): Step[] {
    return Array.from({ length: count }, () => ({ deltaTime, deltaDistance }));
}

// A TrackData point with only the fields a test cares about set.
export function trackPoint(fields: Partial<TrackData>): TrackData {
    return { time: 0, distance: 0, pace: 0, deltaDistance: 0, lat: 0, lon: 0, ...fields };
}
