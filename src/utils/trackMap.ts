import type { TrackData } from "../models/route";

export type ProjectedPoint = {
    time: number;
    x: number;
    y: number;
};

// Equirectangular projection: scaling longitude by cos(latitude) keeps the track from
// being stretched east-west. Accurate enough at the scale of a run.
export function lonScaleFor(points: TrackData[]): number {
    if (points.length === 0) {
        return 1;
    }
    const meanLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    return Math.cos((meanLat * Math.PI) / 180);
}

export function projectPoint(p: TrackData, lonScale: number): ProjectedPoint {
    return { time: p.time, x: p.lon * lonScale, y: -p.lat };
}

// The points inside [start, end], plus one neighbour on each side so the highlighted
// line joins the rest of the track at the window edges.
export function visibleSegment(points: ProjectedPoint[], start: number, end: number): ProjectedPoint[] {
    let first = points.findIndex(p => p.time >= start);
    if (first === -1) {
        return [];
    }
    let last = first;
    while (last + 1 < points.length && points[last + 1].time <= end) {
        last++;
    }
    first = Math.max(first - 1, 0);
    last = Math.min(last + 1, points.length - 1);
    return points.slice(first, last + 1);
}
