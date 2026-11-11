import type { TrackData } from "../models/route";

export type XWindow = {
    start: number;
    end: number;
};

export type YRange = {
    minY: number;
    maxY: number;
};

// Y axis range. Normally 0 to the max. With `robust` (used for pace), the bottom is the lowest
// value in the track, so there's no empty band under the line, and the top is the 95th
// percentile plus headroom, so a few spikes (such as near-standstill pace) don't flatten the
// rest of the line. The clip path cuts off anything above the top.
export function computeYRange(values: number[], robust: boolean): YRange {
    if (values.length === 0) {
        return { minY: 0, maxY: 1 };
    }
    if (!robust) {
        return { minY: 0, maxY: Math.max(0, ...values) || 1 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const minY = sorted[0];
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    const maxY = minY + (p95 - minY) * 1.1;
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
