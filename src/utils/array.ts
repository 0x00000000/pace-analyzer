export type MinMax = {
    min: number;
    max: number;
};

// Smallest and largest value in one pass. Unlike Math.min(...values), it doesn't put every value
// on the call stack, so it works for any length. An empty array gives { min: Infinity, max: -Infinity },
// the same as Math.min() / Math.max() with no arguments.
export function minMax(values: readonly number[]): MinMax {
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return { min, max };
}
