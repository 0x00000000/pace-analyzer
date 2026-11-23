import { describe, expect, it } from "vitest";

import { clampWindow, computeYRange, nearestIndex, sectionStats } from "./chart";
import { trackPoint } from "../test/fixtures";

describe("computeYRange", () => {
    it("returns 0..1 for no values", () => {
        expect(computeYRange([], false)).toEqual({ minY: 0, maxY: 1 });
        expect(computeYRange([], true)).toEqual({ minY: 0, maxY: 1 });
    });

    it("goes from 0 to the max when not robust", () => {
        expect(computeYRange([1, 5, 3], false)).toEqual({ minY: 0, maxY: 5 });
    });

    it("uses 1 as the top when all values are 0", () => {
        expect(computeYRange([0, 0], false)).toEqual({ minY: 0, maxY: 1 });
    });

    it("goes from the min to the max plus headroom when tight", () => {
        const values = Array.from({ length: 100 }, (_, i) => i + 1);
        values.push(201);
        const { minY, maxY } = computeYRange(values, true);
        expect(minY).toBe(1);
        // 201 + (201 - 1) * 0.05
        expect(maxY).toBeCloseTo(211);
        expect(maxY).toBeGreaterThanOrEqual(201);
    });

    it("handles tracks too long to spread into Math.min / Math.max", () => {
        const values = Array.from({ length: 500_000 }, (_, i) => 4 + (i % 100) / 10);
        const loose = computeYRange(values, false);
        expect(loose.minY).toBe(0);
        expect(loose.maxY).toBeCloseTo(13.9);
        const { minY, maxY } = computeYRange(values, true);
        expect(minY).toBe(4);
        expect(maxY).toBeCloseTo(13.9 + 9.9 * 0.05);
    });

    it("gives a flat line a non-zero range", () => {
        expect(computeYRange([4, 4, 4], true)).toEqual({ minY: 4, maxY: 5 });
    });

    it("never puts the top above the limit", () => {
        expect(computeYRange([4, 6, 30], true, 10)).toEqual({ minY: 4, maxY: 10 });
        expect(computeYRange([1, 5, 30], false, 10)).toEqual({ minY: 0, maxY: 10 });
    });

    it("keeps the headroom when every value is under the limit", () => {
        expect(computeYRange([5, 7], true, 10).maxY).toBeCloseTo(7.1);
    });

    it("still gives a non-zero range when every value is over the limit", () => {
        expect(computeYRange([12, 15], true, 10)).toEqual({ minY: 10, maxY: 11 });
    });
});

describe("nearestIndex", () => {
    const points = [0, 1000, 2000, 3000].map(time => trackPoint({ time, distance: time / 2 }));

    it("finds an exact match", () => {
        expect(nearestIndex(points, "time", 1000)).toBe(1);
        expect(nearestIndex(points, "distance", 1500)).toBe(3);
    });

    it("picks the closer neighbour between two points", () => {
        expect(nearestIndex(points, "time", 1400)).toBe(1);
        expect(nearestIndex(points, "time", 1600)).toBe(2);
    });

    it("picks the later point on a tie", () => {
        expect(nearestIndex(points, "time", 1500)).toBe(2);
    });

    it("clamps to the first and last points", () => {
        expect(nearestIndex(points, "time", -50)).toBe(0);
        expect(nearestIndex(points, "time", 99_999)).toBe(3);
    });
});

describe("sectionStats", () => {
    // A point every 10 s and 30 m: 5:33 min/km.
    const points = [1, 2, 3, 4, 5].map(i => trackPoint({ time: i * 10_000, distance: i * 30 }));

    it("covers the whole run, from its start, when every point is inside", () => {
        const stats = sectionStats(points, "distance", 0, 150);
        expect(stats).toMatchObject({ distance: 150, time: 50_000 });
        expect(stats?.pace).toBeCloseTo(50 / 60 / 0.15);
    });

    it("measures a middle section from the point before it", () => {
        // Points at 60, 90 and 120 m are inside; the section starts at the 30 m point.
        expect(sectionStats(points, "distance", 50, 130)).toMatchObject({ distance: 90, time: 30_000 });
    });

    it("gives a pace of 0 when no distance was covered", () => {
        const standing = [trackPoint({ time: 1000, distance: 0 }), trackPoint({ time: 2000, distance: 0 })];
        expect(sectionStats(standing, "time", 0, 5000)).toEqual({ distance: 0, time: 2000, pace: 0 });
    });

    it("returns null when no point is inside", () => {
        expect(sectionStats(points, "distance", 31, 59)).toBeNull();
        expect(sectionStats([], "distance", 0, 100)).toBeNull();
    });
});

describe("clampWindow", () => {
    it("keeps a window that already fits", () => {
        expect(clampWindow(200, 100, 1000)).toEqual({ start: 200, end: 300 });
    });

    it("moves a window past the start back to 0", () => {
        expect(clampWindow(-10, 100, 1000)).toEqual({ start: 0, end: 100 });
    });

    it("moves a window past the end back inside, keeping its span", () => {
        expect(clampWindow(950, 100, 1000)).toEqual({ start: 900, end: 1000 });
    });
});
