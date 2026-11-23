import { describe, expect, it } from "vitest";

import { minMax } from "./array";

describe("minMax", () => {
    it("returns Infinity / -Infinity for no values", () => {
        expect(minMax([])).toEqual({ min: Infinity, max: -Infinity });
    });

    it("uses the single value as both min and max", () => {
        expect(minMax([7])).toEqual({ min: 7, max: 7 });
    });

    it("handles negative values", () => {
        expect(minMax([-3, 5, -10, 2])).toEqual({ min: -10, max: 5 });
    });

    it("works on arrays too long to spread into Math.min / Math.max", () => {
        const values = Array.from({ length: 500_000 }, (_, i) => i);
        expect(minMax(values)).toEqual({ min: 0, max: 499_999 });
    });
});
