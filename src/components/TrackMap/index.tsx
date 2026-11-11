import { useMemo } from "react";

import type { TrackData } from "../../models/route";
import { lonScaleFor, projectPoint, visibleSegment } from "../../utils/geo";
import type { ProjectedPoint } from "../../utils/geo";

import styles from "./styles.module.css";

type Props = {
    points: TrackData[];
    // Visible time window from the graph, ms. This part of the track is drawn in `color`, the rest in gray.
    start: number;
    end: number;
    color: string;
    // The current position (the point under the mouse on the graph, or the last one it was over), or null for none.
    current?: TrackData | null;
};

const SIZE = 400;
const PADDING = 20;
// Smallest area the map zooms to, in degrees of latitude (about 50 m).
const MIN_EXTENT = 0.00045;
const POINTER_RADIUS = 6;

export function TrackMap(
    {
        points,
        start,
        end,
        color,
        current = null,
    }: Props
) {
    const lonScale = useMemo(() => lonScaleFor(points), [points]);
    const projected = useMemo(
        () => points.map(p => projectPoint(p, lonScale)),
        [points, lonScale],
    );

    if (projected.length === 0) {
        return null;
    }

    const visible = visibleSegment(projected, start, end);

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

    const pointer = current ? projectPoint(current, lonScale) : null;

    return (
        <svg
            className={styles.svg}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label="Track map"
        >
            <rect className={styles.background} width={SIZE} height={SIZE} />
            {/* The whole track in gray; the part visible on the graph is drawn over it in color */}
            <polyline
                className={styles.track}
                points={projected.map(toSvg).join(" ")}
                fill="none"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <polyline
                points={visible.map(toSvg).join(" ")}
                fill="none"
                stroke={color}
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
                    fill={color}
                />
            )}
        </svg>
    );
}
