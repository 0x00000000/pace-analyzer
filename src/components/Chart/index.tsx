import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";

import type Route from "../../models/route";

import styles from "./styles.module.css";

type Props = {
    route: Route;
    color: string;
    xAxisLabel: string;
    yAxisLabel: string;
};

type TimeWindow = {
    start: number;
    end: number;
};

type ViewState = TimeWindow & {
    route: Route;
};

type DragState = {
    clientX: number;
    window: TimeWindow;
};

const WIDTH = 800;
const HEIGHT = 400;
const MARGIN = { top: 20, right: 20, bottom: 60, left: 70 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const TICK_COUNT = 5;
// The narrowest visible time window, in ms.
const MIN_SPAN = 10_000;
// How strongly one wheel step zooms.
const ZOOM_SPEED = 0.0015;

function formatTime(ms: number): string {
    const totalSeconds = Math.round(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ss = String(seconds).padStart(2, "0");
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
    }
    return `${minutes}:${ss}`;
}

function formatDistance(meters: number): string {
    return meters >= 10 ? String(Math.round(meters)) : meters.toFixed(1);
}

// Keeps the window inside [0, maxTime] without changing its span.
function clampWindow(start: number, span: number, maxTime: number): TimeWindow {
    const clampedStart = Math.min(Math.max(start, 0), maxTime - span);
    return { start: clampedStart, end: clampedStart + span };
}

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
    }: Props
) {
    const clipId = useId();
    const svgRef = useRef<SVGSVGElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const [view, setView] = useState<ViewState | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const data = route.getTimeDistance();

    const { maxTime, maxDistance } = useMemo(() => ({
        maxTime: Math.max(0, ...data.map(d => d.time)) || 1,
        maxDistance: Math.max(0, ...data.map(d => d.distance)) || 1,
    }), [data]);

    const minSpan = Math.min(MIN_SPAN, maxTime);

    // A view saved for a previous route doesn't apply, so a new route starts fully zoomed out.
    const timeWindow: TimeWindow = view && view.route === route
        ? view
        : { start: 0, end: maxTime };
    const span = timeWindow.end - timeWindow.start;
    const isZoomed = span < maxTime;

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
                const current = prev && prev.route === route ? prev : { start: 0, end: maxTime };
                const currentSpan = current.end - current.start;
                const newSpan = Math.min(Math.max(currentSpan * factor, minSpan), maxTime);
                // Keep the time under the cursor in the same place.
                const anchor = current.start + fraction * currentSpan;
                return { route, ...clampWindow(anchor - fraction * newSpan, newSpan, maxTime) };
            });
        };

        svg.addEventListener("wheel", handleWheel, { passive: false });
        return () => svg.removeEventListener("wheel", handleWheel);
    }, [route, maxTime, minSpan]);

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
        dragRef.current = { clientX: e.clientX, window: timeWindow };
        setIsDragging(true);
    };

    const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
        const drag = dragRef.current;
        if (!drag) {
            return;
        }
        const dragSpan = drag.window.end - drag.window.start;
        const dx = toViewBoxX(e.currentTarget, e.clientX) - toViewBoxX(e.currentTarget, drag.clientX);
        // Dragging right shows earlier times.
        const shift = -(dx / PLOT_WIDTH) * dragSpan;
        setView({ route, ...clampWindow(drag.window.start + shift, dragSpan, maxTime) });
    };

    const handlePointerUp = (e: PointerEvent<SVGSVGElement>) => {
        if (!dragRef.current) {
            return;
        }
        e.currentTarget.releasePointerCapture(e.pointerId);
        dragRef.current = null;
        setIsDragging(false);
    };

    const scaleX = (time: number) => MARGIN.left + ((time - timeWindow.start) / span) * PLOT_WIDTH;
    const scaleY = (distance: number) => MARGIN.top + PLOT_HEIGHT - (distance / maxDistance) * PLOT_HEIGHT;

    const ticks = (from: number, to: number) =>
        Array.from({ length: TICK_COUNT + 1 }, (_, i) => from + ((to - from) * i) / TICK_COUNT);

    const linePoints = data.map(d => `${scaleX(d.time)},${scaleY(d.distance)}`).join(" ");
    const xTicks = ticks(timeWindow.start, timeWindow.end).map(value => ({ pos: scaleX(value), label: formatTime(value) }));
    const yTicks = ticks(0, maxDistance).map(value => ({ pos: scaleY(value), label: formatDistance(value) }));

    if (data.length === 0) {
        return <div className={styles.empty}>No data</div>;
    }

    const xAxisY = MARGIN.top + PLOT_HEIGHT;

    return (
        <div className={styles.wrapper}>
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
        </div>
    );
}
