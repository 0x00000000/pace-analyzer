import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";

import type Route from "../../models/route";
import type { TrackData } from "../../models/route";
import { TrackMap } from "../TrackMap";
import { formatTime } from "../../utils/format";
import { clampWindow, computeYRange, nearestIndex } from "../../utils/chart";
import type { XWindow } from "../../utils/chart";

import styles from "./styles.module.css";

type Props = {
    route: Route;
    color: string;
    xAxisLabel: string;
    yAxisLabel: string;
    // Which TrackData fields go on each axis.
    xKey: "time" | "distance";
    yKey: "deltaDistance" | "pace";
    formatX: (value: number) => string;
    formatY: (value: number) => string;
    // The narrowest visible X window, in X units (ms for time, m for distance).
    minSpan: number;
    // Show the map and stats below the graph. They follow the graph's visible window.
    showDetails?: boolean;
};

type ViewState = XWindow & {
    route: Route;
};

// The last point the mouse was over. Remembered for the route it belongs to.
type LastPoint = {
    route: Route;
    point: TrackData;
};

type DragState = {
    clientX: number;
    window: XWindow;
};

const WIDTH = 800;
const HEIGHT = 260;
const MARGIN = { top: 20, right: 20, bottom: 60, left: 70 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const TICK_COUNT = 5;
// How strongly one wheel step zooms.
const ZOOM_SPEED = 0.0015;

// Converts a mouse X position to the SVG's viewBox coordinates.
function toViewBoxX(svg: SVGSVGElement, clientX: number): number {
    const rect = svg.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * WIDTH;
}

// Converts a mouse Y position to the SVG's viewBox coordinates.
function toViewBoxY(svg: SVGSVGElement, clientY: number): number {
    const rect = svg.getBoundingClientRect();
    return ((clientY - rect.top) / rect.height) * HEIGHT;
}

// True when the point (in viewBox coordinates) is inside the plot area, not over the axes or labels.
function isInPlotArea(x: number, y: number): boolean {
    return x >= MARGIN.left && x <= MARGIN.left + PLOT_WIDTH
        && y >= MARGIN.top && y <= MARGIN.top + PLOT_HEIGHT;
}

export function Chart(
    {
        route,
        color,
        xAxisLabel,
        yAxisLabel,
        xKey,
        yKey,
        formatX,
        formatY,
        minSpan: minSpanProp,
        showDetails = true,
    }: Props
) {
    const clipId = useId();
    const svgRef = useRef<SVGSVGElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const [view, setView] = useState<ViewState | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    // Mouse X over the plot area, in viewBox coordinates, or null when the mouse isn't there.
    // Kept in screen terms so the value under the cursor stays right while zooming or dragging.
    const [hoverX, setHoverX] = useState<number | null>(null);
    // The point the mouse was last over, kept after the mouse leaves the graph.
    const [lastPoint, setLastPoint] = useState<LastPoint | null>(null);

    const data = route.getTrackData();

    // Pace is 0 where no distance was covered, which means "unknown", not "infinitely fast".
    const plotted = useMemo(
        () => data.filter(d => yKey !== "pace" || d.pace > 0),
        [data, yKey],
    );

    const { maxX, minY, maxY } = useMemo(() => ({
        maxX: Math.max(0, ...data.map(d => d[xKey])) || 1,
        ...computeYRange(plotted.map(d => d[yKey]), yKey === "pace"),
    }), [data, plotted, xKey, yKey]);

    const minSpan = Math.min(minSpanProp, maxX);

    // A view saved for a previous route doesn't apply, so a new route starts fully zoomed out.
    const xWindow: XWindow = view && view.route === route
        ? view
        : { start: 0, end: maxX };
    const span = xWindow.end - xWindow.start;
    const isZoomed = span < maxX;

    // The point under the mouse.
    const hovered = hoverX !== null && data.length > 0
        ? data[nearestIndex(data, xKey, xWindow.start + ((hoverX - MARGIN.left) / PLOT_WIDTH) * span)]
        : null;
    // The current position: the point under the mouse, or the last one it was over.
    // Its values are shown in the stats, and it's marked on the graph and the map.
    const current = hovered ?? (lastPoint && lastPoint.route === route ? lastPoint.point : null);

    // Called when the mouse stops being over the plot area: remembers where it was.
    const rememberHovered = () => {
        if (hovered) {
            setLastPoint({ route, point: hovered });
        }
    };

    // React registers wheel listeners as passive, so preventDefault (to stop the page
    // from scrolling) needs a native listener.
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) {
            return;
        }

        const handleWheel = (e: WheelEvent) => {
            const cursorX = toViewBoxX(svg, e.clientX);
            const cursorY = toViewBoxY(svg, e.clientY);
            // Outside the plot area the wheel scrolls the page as usual.
            if (!isInPlotArea(cursorX, cursorY)) {
                return;
            }
            e.preventDefault();
            const fraction = (cursorX - MARGIN.left) / PLOT_WIDTH;
            const factor = Math.exp(e.deltaY * ZOOM_SPEED);

            setView(prev => {
                const current = prev && prev.route === route ? prev : { start: 0, end: maxX };
                const currentSpan = current.end - current.start;
                const newSpan = Math.min(Math.max(currentSpan * factor, minSpan), maxX);
                // Keep the X value under the cursor in the same place.
                const anchor = current.start + fraction * currentSpan;
                return { route, ...clampWindow(anchor - fraction * newSpan, newSpan, maxX) };
            });
        };

        svg.addEventListener("wheel", handleWheel, { passive: false });
        return () => svg.removeEventListener("wheel", handleWheel);
    }, [route, maxX, minSpan]);

    const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
        if (e.button !== 0 || !isZoomed) {
            return;
        }
        const x = toViewBoxX(e.currentTarget, e.clientX);
        const y = toViewBoxY(e.currentTarget, e.clientY);
        if (!isInPlotArea(x, y)) {
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { clientX: e.clientX, window: xWindow };
        setIsDragging(true);
    };

    const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
        const x = toViewBoxX(e.currentTarget, e.clientX);
        const y = toViewBoxY(e.currentTarget, e.clientY);
        const inPlot = isInPlotArea(x, y);
        if (!inPlot) {
            rememberHovered();
        }
        setHoverX(inPlot ? x : null);

        const drag = dragRef.current;
        if (!drag) {
            return;
        }
        const dragSpan = drag.window.end - drag.window.start;
        const dx = toViewBoxX(e.currentTarget, e.clientX) - toViewBoxX(e.currentTarget, drag.clientX);
        // Dragging right shows earlier values.
        const shift = -(dx / PLOT_WIDTH) * dragSpan;
        setView({ route, ...clampWindow(drag.window.start + shift, dragSpan, maxX) });
    };

    const handlePointerLeave = () => {
        rememberHovered();
        setHoverX(null);
    };

    const handlePointerUp = (e: PointerEvent<SVGSVGElement>) => {
        if (!dragRef.current) {
            return;
        }
        e.currentTarget.releasePointerCapture(e.pointerId);
        dragRef.current = null;
        setIsDragging(false);
    };

    const scaleX = (x: number) => MARGIN.left + ((x - xWindow.start) / span) * PLOT_WIDTH;
    const scaleY = (y: number) => MARGIN.top + PLOT_HEIGHT - ((y - minY) / (maxY - minY)) * PLOT_HEIGHT;

    const ticks = (from: number, to: number) =>
        Array.from({ length: TICK_COUNT + 1 }, (_, i) => from + ((to - from) * i) / TICK_COUNT);

    const linePoints = plotted.map(d => `${scaleX(d[xKey])},${scaleY(d[yKey])}`).join(" ");
    // Every track point in the visible window, including the pace-0 ones the line skips,
    // so the map covers the whole stretch.
    const windowPoints = data.filter(d => d[xKey] >= xWindow.start && d[xKey] <= xWindow.end);
    const firstPoint = windowPoints.length > 0 ? windowPoints[0] : null;
    // The map selects by time, so turn the X window into the time span of its points.
    // An empty window gives an empty range, and the map shows no highlight.
    const mapStart = firstPoint ? firstPoint.time : Infinity;
    const mapEnd = windowPoints.length > 0 ? windowPoints[windowPoints.length - 1].time : -Infinity;
    const xTicks = ticks(xWindow.start, xWindow.end).map(value => ({ pos: scaleX(value), label: formatX(value) }));
    const yTicks = ticks(minY, maxY).map(value => ({ pos: scaleY(value), label: formatY(value) }));

    if (data.length === 0) {
        return <div className={styles.empty}>No data</div>;
    }

    const xAxisY = MARGIN.top + PLOT_HEIGHT;

    return (
        <div className={styles.wrapper}>
            {/* Left column: the graph with the stats under it */}
            <div className={styles.main}>
                <svg
                    ref={svgRef}
                    className={`${styles.svg} ${isDragging ? styles.dragging : ""}`}
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    role="img"
                    aria-label={`${yAxisLabel} by ${xAxisLabel}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                >
                    <defs>
                        <clipPath id={clipId}>
                            <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_WIDTH} height={PLOT_HEIGHT} />
                        </clipPath>
                    </defs>

                    {/* Grid lines and Y ticks */}
                    {yTicks.map((tick, i) => (
                        <g key={`y-${i}`}>
                            <line
                                className={styles.grid}
                                x1={MARGIN.left}
                                x2={MARGIN.left + PLOT_WIDTH}
                                y1={tick.pos}
                                y2={tick.pos}
                            />
                            <text
                                className={styles.tickLabel}
                                x={MARGIN.left - 8}
                                y={tick.pos}
                                textAnchor="end"
                                dominantBaseline="middle"
                            >
                                {tick.label}
                            </text>
                        </g>
                    ))}

                    {/* X ticks */}
                    {xTicks.map((tick, i) => (
                        <g key={`x-${i}`}>
                            <line
                                className={styles.axis}
                                x1={tick.pos}
                                x2={tick.pos}
                                y1={xAxisY}
                                y2={xAxisY + 5}
                            />
                            <text
                                className={styles.tickLabel}
                                x={tick.pos}
                                y={xAxisY + 20}
                                textAnchor="middle"
                            >
                                {tick.label}
                            </text>
                        </g>
                    ))}

                    {/* Axes */}
                    <line className={styles.axis} x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={xAxisY} />
                    <line className={styles.axis} x1={MARGIN.left} x2={MARGIN.left + PLOT_WIDTH} y1={xAxisY} y2={xAxisY} />

                    {/* Data line, clipped to the plot area so zoomed-out parts don't spill over the axes */}
                    <polyline
                        points={linePoints}
                        clipPath={`url(#${clipId})`}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />

                    {/* Vertical guide at the current position */}
                    {current && (
                        <line
                            className={styles.hoverLine}
                            clipPath={`url(#${clipId})`}
                            x1={scaleX(current[xKey])}
                            x2={scaleX(current[xKey])}
                            y1={MARGIN.top}
                            y2={xAxisY}
                        />
                    )}

                    {/* Invisible overlay on the plot area: shows the grab cursor only where dragging works */}
                    <rect
                        className={isZoomed ? styles.draggable : ""}
                        x={MARGIN.left}
                        y={MARGIN.top}
                        width={PLOT_WIDTH}
                        height={PLOT_HEIGHT}
                        fill="transparent"
                    />

                    {/* Axis labels */}
                    <text
                        className={styles.axisLabel}
                        x={MARGIN.left + PLOT_WIDTH / 2}
                        y={HEIGHT - 12}
                        textAnchor="middle"
                    >
                        {xAxisLabel}
                    </text>
                    <text
                        className={styles.axisLabel}
                        transform={`translate(18, ${MARGIN.top + PLOT_HEIGHT / 2}) rotate(-90)`}
                        textAnchor="middle"
                    >
                        {yAxisLabel}
                    </text>
                </svg>

                {/* Values at the current position, in a row under the graph;
                    dashes until the mouse has been over the graph */}
                {showDetails && <div className={styles.stats}>
                    <div className={styles.stat}>
                        <div className={styles.statLabel}>Pace</div>
                        <div className={styles.statValue}>
                            {current && current.pace > 0 ? route.getPaceAsString(current.pace) : "–"}
                            <span className={styles.statUnit}> min/km</span>
                        </div>
                    </div>

                    <div className={styles.stat}>
                        <div className={styles.statLabel}>Distance</div>
                        <div className={styles.statValue}>
                            {current ? (current.distance / 1000).toFixed(2) : "–"}
                            <span className={styles.statUnit}> km</span>
                        </div>
                    </div>

                    <div className={styles.stat}>
                        <div className={styles.statLabel}>Time</div>
                        <div className={styles.statValue}>
                            {current ? formatTime(current.time) : "–"}
                        </div>
                    </div>
                </div>}
            </div>

            {/* The map sits to the right of the graph and the stats, and highlights its visible window */}
            {showDetails && <div className={styles.map}>
                <TrackMap
                    points={data}
                    start={mapStart}
                    end={mapEnd}
                    color={color}
                    current={current}
                />
            </div>}
        </div>
    );
}
