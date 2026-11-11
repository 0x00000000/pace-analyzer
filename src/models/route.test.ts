import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Route from "./route";
import { makeRun, steady } from "../test/fixtures";

// Pace in min/km for `ms` milliseconds over `m` meters.
const pace = (ms: number, m: number) => (ms / 60_000) / (m / 1000);

type Options = {
    paceTimeLimit?: number;
    smoothNeighboursCount?: number;
    smoothMaxDeviation?: number;
};

// Loads a run. The settings must be set before loadData, which computes the pace.
function load(json: string, options: Options = {}): Route {
    const route = new Route();
    if (options.paceTimeLimit !== undefined) {
        route.setPaceTimeLimit(options.paceTimeLimit);
    }
    if (options.smoothNeighboursCount !== undefined) {
        route.setSmoothNeighboursCount(options.smoothNeighboursCount);
    }
    if (options.smoothMaxDeviation !== undefined) {
        route.setSmoothMaxDeviation(options.smoothMaxDeviation);
    }
    route.loadData(json);
    return route;
}

const paces = (route: Route) => route.getTrackData().map(d => d.pace);

describe("Route.loadData", () => {
    // loadData logs parse errors; keep the test output clean.
    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => {});
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("accumulates time and distance and keeps the position", () => {
        const data = load(makeRun(steady(3))).getTrackData();
        expect(data.map(d => d.time)).toEqual([0, 1000, 2000, 3000]);
        expect(data.map(d => d.distance)).toEqual([0, 3, 6, 9]);
        expect(data.map(d => d.deltaDistance)).toEqual([0, 3, 3, 3]);
        expect(data[0].lat).toBe(52.396);
        expect(data[0].lon).toBe(9.7396);
    });

    it("doesn't count paused time", () => {
        const json = makeRun([
            ...steady(2),
            { deltaTime: 1000, deltaDistance: 3, type: "PausePoint" },
            { deltaTime: 0, deltaDistance: 0, type: "ResumePoint", deltaPause: 60_000 },
            ...steady(2),
        ]);
        const data = load(json).getTrackData();
        expect(data.map(d => d.time)).toEqual([0, 1000, 2000, 3000, 3000, 4000, 5000]);
    });

    it("gives no track data when there are no points", () => {
        expect(load("{}").getTrackData()).toEqual([]);
        expect(load(JSON.stringify({ points: [] })).getTrackData()).toEqual([]);
    });

    it("keeps the previous data and doesn't throw on invalid JSON", () => {
        const route = load(makeRun(steady(3)));
        expect(() => route.loadData("not json")).not.toThrow();
        expect(route.getTrackData()).toHaveLength(4);
        expect(console.log).toHaveBeenCalled();
    });
});

describe("Route pace", () => {
    it("is 0 where no distance was covered", () => {
        expect(load(makeRun(steady(3))).getTrackData()[0].pace).toBe(0);
    });

    it("matches the running pace on a steady run", () => {
        const data = load(makeRun(steady(20))).getTrackData();
        expect(data[10].pace).toBeCloseTo(pace(1000, 3));
    });

    // Short tracks (under 7 points) aren't smoothed, so these show the raw pace window.
    it("only looks back over the pace window", () => {
        const json = makeRun([...steady(2, 1000, 2), ...steady(3, 1000, 4)]);

        // The default 30 s window covers the whole run: 5 s over 16 m.
        const wide = load(json).getTrackData();
        expect(wide[5].pace).toBeCloseTo(pace(5000, 16));

        // A 1 s window only sees the last fast steps.
        const narrow = load(json, { paceTimeLimit: 1000 }).getTrackData();
        expect(narrow[5].pace).toBeCloseTo(pace(1000, 4));
    });

    it("has default pace and smoothing settings", () => {
        const route = new Route();
        expect(route.getPaceTimeLimit()).toBe(30_000);
        expect(route.getSmoothNeighboursCount()).toBe(3);
        expect(route.getSmoothMaxDeviation()).toBe(0.1);
    });
});

describe("Route smoothing", () => {
    // A steady run with one slow step in the middle. A 1 s pace window keeps the raw
    // spike sharp (8:20 min/km at the two points that include the slow step).
    const spikyRun = makeRun([...steady(9), { deltaTime: 1000, deltaDistance: 1 }, ...steady(10)]);
    const rawSpike = pace(2000, 4);

    it("flattens a single spike", () => {
        const data = load(spikyRun, { paceTimeLimit: 1000 }).getTrackData();
        expect(data[10].pace).toBeLessThan(rawSpike);
        expect(data[10].pace).toBeGreaterThan(pace(1000, 3));
    });

    it("is turned off by a neighbour count below 1 or a max deviation of 0", () => {
        const off1 = load(spikyRun, { paceTimeLimit: 1000, smoothNeighboursCount: 0 });
        expect(off1.getTrackData()[10].pace).toBeCloseTo(rawSpike);
        const off2 = load(spikyRun, { paceTimeLimit: 1000, smoothMaxDeviation: 0 });
        expect(paces(off2)).toEqual(paces(off1));
    });

    it("leaves tracks shorter than the neighbourhood alone", () => {
        // 6 points, fewer than the 7 that 3 neighbours on each side need.
        const json = makeRun([...steady(2, 1000, 2), ...steady(3, 1000, 4)]);
        const smoothed = load(json, { paceTimeLimit: 1000 });
        const raw = load(json, { paceTimeLimit: 1000, smoothNeighboursCount: 0 });
        expect(paces(smoothed)).toEqual(paces(raw));
    });
});

describe("Route.getPaceAsString", () => {
    const route = new Route();

    it("formats min/km as m:ss", () => {
        expect(route.getPaceAsString(5.5)).toBe("5:30");
        expect(route.getPaceAsString(4)).toBe("4:00");
        expect(route.getPaceAsString(10.25)).toBe("10:15");
    });

    it("carries a rounded-up 60 seconds into the minutes", () => {
        expect(route.getPaceAsString(5.999)).toBe("6:00");
    });
});
