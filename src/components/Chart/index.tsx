import { useMemo } from "react";

import type Route from "../../models/route";

import styles from "./styles.module.css";

type Props = {
    route: Route;
    color: string;
    xAxisLabel: string;
    yAxisLabel: string;
};

const WIDTH = 800;
const HEIGHT = 400;
const MARGIN = { top: 20, right: 20, bottom: 60, left: 70 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const TICK_COUNT = 5;

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

export function Chart(
    {
        route,
        color,
        xAxisLabel,
        yAxisLabel,
    }: Props
) {
    const data = route.getTimeDistance();

    const { linePoints, xTicks, yTicks } = useMemo(() => {
        const maxTime = Math.max(0, ...data.map(d => d.time)) || 1;
        const maxDistance = Math.max(0, ...data.map(d => d.distance)) || 1;

        const scaleX = (time: number) => MARGIN.left + (time / maxTime) * PLOT_WIDTH;
        const scaleY = (distance: number) => MARGIN.top + PLOT_HEIGHT - (distance / maxDistance) * PLOT_HEIGHT;

        const ticks = (max: number) =>
            Array.from({ length: TICK_COUNT + 1 }, (_, i) => (max * i) / TICK_COUNT);

        return {
            linePoints: data.map(d => `${scaleX(d.time)},${scaleY(d.distance)}`).join(" "),
            xTicks: ticks(maxTime).map(value => ({ pos: scaleX(value), label: formatTime(value) })),
            yTicks: ticks(maxDistance).map(value => ({ pos: scaleY(value), label: formatDistance(value) })),
        };
    }, [data]);

    if (data.length === 0) {
        return <div className={styles.empty}>No data</div>;
    }

    const xAxisY = MARGIN.top + PLOT_HEIGHT;

    return (
        <div className={styles.wrapper}>
            <svg
                className={styles.svg}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="img"
                aria-label={`${yAxisLabel} by ${xAxisLabel}`}
            >
                {/* Grid lines and Y ticks */}
                {yTicks.map(tick => (
                    <g key={`y-${tick.pos}`}>
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
                {xTicks.map(tick => (
                    <g key={`x-${tick.pos}`}>
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

                {/* Data line */}
                <polyline
                    points={linePoints}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
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
