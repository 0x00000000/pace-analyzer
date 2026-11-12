import type { TrackData } from "../models/route";

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
export function computeYRange(values: number[], tight: boolean): YRange {
    if (values.length === 0) {
        return { minY: 0, maxY: 1 };
    }
    const max = Math.max(...values);
    if (!tight) {
        return { minY: 0, maxY: Math.max(0, max) || 1 };
    }
    const minY = Math.min(...values);
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

// Keeps the window inside [0, maxX] without changing its span.
export function clampWindow(start: number, span: number, maxX: number): XWindow {
    const clampedStart = Math.min(Math.max(start, 0), maxX - span);
    return { start: clampedStart, end: clampedStart + span };
}
