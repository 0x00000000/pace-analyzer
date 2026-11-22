import { useMemo } from "react";

import type { TrackData } from "../../models/route";
import { lonScaleFor, projectPoint, visibleSegment } from "../../utils/trackMap";
import type { ProjectedPoint } from "../../utils/trackMap";

import styles from "./styles.module.css";

type Props = {
    trackPoints: TrackData[];
    highlightedColor: string;
    highlightedFromTime: number;
    highlightedToTime: number;
    currentPoint?: TrackData | null;
};

const SIZE: number = 400;
const PADDING: number = 20;
// Smallest area the map zooms to, in degrees of latitude (about 50 m).
const MIN_EXTENT: number = 0.00045;
const POINTER_RADIUS: number = 6;

export function TrackMap(
    {
        trackPoints,
        highlightedColor,
        highlightedFromTime,
        highlightedToTime,
        currentPoint = null,
    }: Props
) {
    const lonScale = useMemo(() => lonScaleFor(trackPoints), [trackPoints]);
    const projected = useMemo(
        () => trackPoints.map(p => projectPoint(p, lonScale)),
        [trackPoints, lonScale],
    );

    if (projected.length === 0) {
        return null;
    }

    const highlightedSegment = visibleSegment(projected, highlightedFromTime, highlightedToTime);

    // The map always fits the whole track (it doesn't follow the graph's zoom),
    // grown to the minimum size if needed.
    const xs = projected.map(p => p.x);
    const ys = projected.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const extent = Math.max(maxX - minX, maxY - minY, MIN_EXTENT);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // One scale for both axes so the shape isn't distorted; the box is centered.
    const scale = (SIZE - 2 * PADDING) / extent;
    const toSvgX = (p: ProjectedPoint) => SIZE / 2 + (p.x - centerX) * scale;
    const toSvgY = (p: ProjectedPoint) => SIZE / 2 + (p.y - centerY) * scale;
    const toSvg = (p: ProjectedPoint) => `${toSvgX(p)},${toSvgY(p)}`;

    const pointer = currentPoint ? projectPoint(currentPoint, lonScale) : null;

    return (
        <svg
            className={styles.svg}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label="Track map"
        >
            <rect className={styles.background} width={SIZE} height={SIZE} />
            <polyline
                className={styles.track}
                points={projected.map(toSvg).join(" ")}
                fill="none"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <polyline
                points={highlightedSegment.map(toSvg).join(" ")}
                fill="none"
                stroke={highlightedColor}
                strokeWidth={4}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            {pointer && (
                <circle
                    className={styles.pointer}
                    cx={toSvgX(pointer)}
                    cy={toSvgY(pointer)}
                    r={POINTER_RADIUS}
                    fill={highlightedColor}
                />
            )}
        </svg>
    );
}
