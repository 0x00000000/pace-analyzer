import { describe, expect, it } from "vitest";

import { formatTime, formatPace, formatKilometers } from "./format";

describe("formatTime", () => {
    it("formats under an hour as m:ss", () => {
        expect(formatTime(0)).toBe("0:00");
        expect(formatTime(5000)).toBe("0:05");
        expect(formatTime(16 * 60_000 + 12_000)).toBe("16:12");
    });

    it("rounds to the nearest second", () => {
        expect(formatTime(59_400)).toBe("0:59");
        expect(formatTime(59_500)).toBe("1:00");
    });

    it("formats an hour and longer as h:mm:ss", () => {
        expect(formatTime(3_600_000)).toBe("1:00:00");
        expect(formatTime(3_723_000)).toBe("1:02:03");
    });
});

describe("formatPace", () => {
    it("formats min/km as m:ss", () => {
        expect(formatPace(5.5)).toBe("5:30");
        expect(formatPace(4)).toBe("4:00");
        expect(formatPace(10.25)).toBe("10:15");
    });

    it("carries a rounded-up 60 seconds into the minutes", () => {
        expect(formatPace(5.999)).toBe("6:00");
    });
});

describe("formatKilometers", () => {
    it("converts meters to km with two decimals", () => {
        expect(formatKilometers(0)).toBe("0.00");
        expect(formatKilometers(1234)).toBe("1.23");
        expect(formatKilometers(42_195)).toBe("42.20");
    });
});
