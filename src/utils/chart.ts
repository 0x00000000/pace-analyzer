import type { TrackData } from "../models/route";
import { minMax } from "./array";

export type XWindow = {
    start: number;
    end: number;
};

export type YRange = {
    minY: number;
    maxY: number;
};

// Y axis range. Normally 0 to the max. With `tight` (used for pace), the bottom is the lowest
// value in the track, so there's no empty band under the line. The top is always the highest
// value plus a little headroom, so the whole line, including its peaks, stays visible.
// The top never goes above `limit`: values over it are cut off by the plot area.
export function computeYRange(values: number[], tight: boolean, limit: number = Infinity): YRange {
    if (values.length === 0) {
        return { minY: 0, maxY: 1 };
    }
    const range = computeUnlimitedYRange(values.map(v => Math.min(v, limit)), tight);
    // Only cap when that still leaves a non-zero range (not when every value is over the limit).
    return range.maxY > limit && limit > range.minY
        ? { minY: range.minY, maxY: limit }
        : range;
}

function computeUnlimitedYRange(values: number[], tight: boolean): YRange {
    const { min: minY, max } = minMax(values);
    if (!tight) {
        return { minY: 0, maxY: Math.max(0, max) || 1 };
    }
    const maxY = max + (max - minY) * 0.05;
    // A flat line (all values equal) still needs a non-zero range to scale against.
    return { minY, maxY: maxY > minY ? maxY : minY + 1 };
}

// Index of the point whose `key` value is closest to `value`. `points` must be sorted by `key`
// (time and distance only ever grow along a run).
export function nearestIndex(points: TrackData[], key: "time" | "distance", value: number): number {
    let lo = 0;
    let hi = points.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (points[mid][key] < value) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    if (lo > 0 && value - points[lo - 1][key] < points[lo][key] - value) {
        return lo - 1;
    }
    return lo;
}

export type SectionStats = {
    // Meters covered in the section.
    distance: number;
    // Milliseconds the section took.
    time: number;
    // Average pace in min/km, or 0 when no distance was covered.
    pace: number;
};

// Totals for the part of the run whose `key` value is in [start, end]. Each point's distance and
// time are totals up to that point, so the section is measured from the point just before the
// first one inside it (or from the start of the run). Returns null when no point is inside.
export function sectionStats(
    points: TrackData[],
    key: "time" | "distance",
    start: number,
    end: number,
): SectionStats | null {
    let first = -1;
    let last = -1;
    for (let i = 0; i < points.length; i++) {
        if (points[i][key] >= start && points[i][key] <= end) {
            if (first < 0) {
                first = i;
            }
            last = i;
        }
    }
    if (first < 0) {
        return null;
    }
    const before = first > 0 ? points[first - 1] : { distance: 0, time: 0 };
    const distance = points[last].distance - before.distance;
    const time = points[last].time - before.time;
    const pace = distance > 0 ? (time / 60000) / (distance / 1000) : 0;
    return { distance, time, pace };
}

// Keeps the window inside [0, maxX] without changing its span.
export function clampWindow(start: number, span: number, maxX: number): XWindow {
    const clampedStart = Math.min(Math.max(start, 0), maxX - span);
    return { start: clampedStart, end: clampedStart + span };
}
