import { describe, expect, it } from "vitest";

import { clampWindow, computeYRange, nearestIndex } from "./chart";
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
        expect(maxY).toBeGreaterThanOrEqual(Math.max(...values));
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
