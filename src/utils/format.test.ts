import { describe, expect, it } from "vitest";

import { formatKilometers, formatTime } from "./format";

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

describe("formatKilometers", () => {
    it("converts meters to km with two decimals", () => {
        expect(formatKilometers(0)).toBe("0.00");
        expect(formatKilometers(1234)).toBe("1.23");
        expect(formatKilometers(42_195)).toBe("42.20");
    });
});
