import { describe, expect, it } from "vitest";

import Route from "./route";
import { makeRun, steady } from "../test/fixtures";

// Pace in min/km for `ms` milliseconds over `m` meters.
const pace = (ms: number, m: number) => (ms / 60_000) / (m / 1000);

type Options = {
    paceWindow?: number;
    smoothNeighboursCount?: number;
    smoothMaxDeviation?: number;
};

// Loads a run. The settings must be set before loadData, which computes the pace.
function load(json: string, options: Options = {}): Route {
    const route = new Route();
    if (options.paceWindow !== undefined) {
        route.setPaceWindow(options.paceWindow);
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
    it("accumulates time and distance and keeps the position", () => {
        const data = load(makeRun(steady(3))).getTrackData();
        expect(data.map(d => d.time)).toEqual([0, 1000, 2000, 3000]);
        expect(data.map(d => d.distance)).toEqual([0, 3, 6, 9]);
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

    it("throws on empty input", () => {
        expect(() => load("")).toThrow(/Paste the JSON/);
        expect(() => load("  \n ")).toThrow(/Paste the JSON/);
    });

    it("throws on invalid JSON", () => {
        expect(() => load("not json")).toThrow(/isn't valid JSON/);
    });

    it("throws when there is no points list", () => {
        expect(() => load("{}")).toThrow(/No "points" list/);
        expect(() => load("null")).toThrow(/No "points" list/);
        expect(() => load(JSON.stringify({ points: "x" }))).toThrow(/No "points" list/);
    });

    it("throws when the points list is empty", () => {
        expect(() => load(JSON.stringify({ points: [] }))).toThrow(/no GPS points/);
    });

    it("throws naming the first point with a missing or non-numeric field", () => {
        const points = JSON.parse(makeRun(steady(3))).points;
        delete points[2].latitude;
        expect(() => load(JSON.stringify({ points }))).toThrow(/Point 3 /);
        points[2].latitude = 52;
        points[1].deltaTime = "1000";
        expect(() => load(JSON.stringify({ points }))).toThrow(/Point 2 /);
    });

    it("clears the previous data when a load fails", () => {
        const route = load(makeRun(steady(3)));
        expect(() => route.loadData("not json")).toThrow();
        expect(route.getTrackData()).toEqual([]);
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

    // Short tracks (under 9 points) aren't smoothed, so these show the raw pace window.
    it("only looks back over the pace window", () => {
        const json = makeRun([...steady(2, 1000, 2), ...steady(3, 1000, 4)]);

        // The default 30 s window covers the whole run: 5 s over 16 m.
        const wide = load(json).getTrackData();
        expect(wide[5].pace).toBeCloseTo(pace(5000, 16));

        // A 1 s window only sees the last fast steps.
        const narrow = load(json, { paceWindow: 1 }).getTrackData();
        expect(narrow[5].pace).toBeCloseTo(pace(1000, 4));
    });

    it("has default pace and smoothing settings", () => {
        const route = new Route();
        expect(route.getPaceWindow()).toBe(30);
        expect(route.getSmoothNeighboursCount()).toBe(4);
        expect(route.getSmoothMaxDeviation()).toBe(10);
    });
});

describe("Route smoothing", () => {
    // A steady run with one slow step in the middle. A 1 s pace window keeps the raw
    // spike sharp (16:40 min/km at the slow step).
    const spikyRun = makeRun([...steady(9), { deltaTime: 1000, deltaDistance: 1 }, ...steady(10)]);
    const rawSpike = pace(1000, 1);

    it("flattens a single spike", () => {
        const data = load(spikyRun, { paceWindow: 1 }).getTrackData();
        expect(data[10].pace).toBeLessThan(rawSpike);
        expect(data[10].pace).toBeGreaterThan(pace(1000, 3));
    });

    it("is turned off by a neighbour count below 1 or a max deviation of 0", () => {
        const off1 = load(spikyRun, { paceWindow: 1, smoothNeighboursCount: 0 });
        expect(off1.getTrackData()[10].pace).toBeCloseTo(rawSpike);
        const off2 = load(spikyRun, { paceWindow: 1, smoothMaxDeviation: 0 });
        expect(paces(off2)).toEqual(paces(off1));
    });

    it("leaves tracks shorter than the neighbourhood alone", () => {
        // 6 points, fewer than the 9 that 4 neighbours on each side need.
        const json = makeRun([...steady(2, 1000, 2), ...steady(3, 1000, 4)]);
        const smoothed = load(json, { paceWindow: 1 });
        const raw = load(json, { paceWindow: 1, smoothNeighboursCount: 0 });
        expect(paces(smoothed)).toEqual(paces(raw));
    });
});
