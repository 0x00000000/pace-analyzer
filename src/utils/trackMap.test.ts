import { describe, expect, it } from "vitest";

import { lonScaleFor, projectPoint, visibleSegment } from "./trackMap";
import type { ProjectedPoint } from "./trackMap";
import { trackPoint } from "../test/fixtures";

describe("lonScaleFor", () => {
    it("is 1 for no points", () => {
        expect(lonScaleFor([])).toBe(1);
    });

    it("is cos of the mean latitude", () => {
        const points = [trackPoint({ lat: 50 }), trackPoint({ lat: 70 })];
        expect(lonScaleFor(points)).toBeCloseTo(0.5);
    });
});

describe("projectPoint", () => {
    it("scales longitude and flips latitude so north is up", () => {
        expect(projectPoint(trackPoint({ time: 7, lat: 52, lon: 10 }), 0.5)).toEqual({ time: 7, x: 5, y: -52 });
    });
});

describe("visibleSegment", () => {
    const points: ProjectedPoint[] = [0, 1, 2, 3, 4, 5].map(i => ({ time: i * 1000, x: i, y: 0 }));
    const times = (segment: ProjectedPoint[]) => segment.map(p => p.time / 1000);

    it("returns the points in the window plus one neighbour on each side", () => {
        expect(times(visibleSegment(points, 2000, 3000))).toEqual([1, 2, 3, 4]);
    });

    it("doesn't go past the ends of the track", () => {
        expect(times(visibleSegment(points, 0, 5000))).toEqual([0, 1, 2, 3, 4, 5]);
        expect(times(visibleSegment(points, 0, 1000))).toEqual([0, 1, 2]);
    });

    it("still joins the track when the window falls between two points", () => {
        expect(times(visibleSegment(points, 2500, 2600))).toEqual([2, 3, 4]);
    });

    it("is empty when the window starts after the track", () => {
        expect(visibleSegment(points, 9000, 10_000)).toEqual([]);
        expect(visibleSegment([], 0, 1000)).toEqual([]);
    });
});
