import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { Chart } from ".";
import Route from "../../models/route";
import { formatKilometers, formatPace } from "../../utils/format";
import { makeRun, steady } from "../../test/fixtures";

function renderChart(route: Route) {
    return render(
        <Chart
            route={route}
            color="#e8590c"
            xAxisLabel="Distance (km)"
            yAxisLabel="Pace (min/km)"
            xKey="distance"
            yKey="pace"
            formatX={formatKilometers}
            formatY={formatPace}
            minSpan={50}
        />,
    );
}

// The text of the Pace, Distance and Time values at the current position.
function statValues(container: HTMLElement): string[] {
    const stats = container.querySelector(".stats");
    return [...(stats?.querySelectorAll(".statValue") ?? [])].map(el => el.textContent ?? "");
}

// The text of the Average pace, Distance and Time values of the visible section.
function sectionValues(container: HTMLElement): string[] {
    const section = container.querySelector('section[aria-label="Visible section"]');
    return [...(section?.querySelectorAll(".statValue") ?? [])].map(el => el.textContent ?? "");
}

function graph(container: HTMLElement): SVGSVGElement {
    const svg = container.querySelector<SVGSVGElement>('svg[aria-label="Pace (min/km) by Distance (km)"]');
    if (!svg) {
        throw new Error("graph not rendered");
    }
    return svg;
}

describe("Chart", () => {
    beforeEach(() => {
        // jsdom has no layout. Make every element report the graph's viewBox size, so screen
        // coordinates equal viewBox coordinates.
        vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
            { left: 0, top: 0, width: 800, height: 260, right: 800, bottom: 260, x: 0, y: 0 } as DOMRect,
        );
    });
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("shows 'No data' for an empty route", () => {
        const { getByText } = renderChart(new Route());
        expect(getByText("No data")).toBeInTheDocument();
    });

    describe("with a run", () => {
        // 100 steps of 1 s and 3 m: 300 m in 1:40, 5:33 min/km.
        const route = new Route();
        route.loadData(makeRun(steady(100)));

        it("shows dashes before the mouse has been over the graph", () => {
            const { container } = renderChart(route);
            expect(statValues(container)).toEqual(["– min/km", "– km", "–"]);
        });

        it("shows the values at the point under the mouse", () => {
            const { container } = renderChart(route);
            // The middle of the plot area (left margin 70, width 710) is 150 m into the run.
            fireEvent.pointerMove(graph(container), { clientX: 70 + 355, clientY: 100 });
            expect(statValues(container)).toEqual(["5:33 min/km", "0.15 km", "0:50"]);
        });

        it("keeps the last position after the mouse leaves", () => {
            const { container } = renderChart(route);
            const svg = graph(container);
            fireEvent.pointerMove(svg, { clientX: 70 + 355, clientY: 100 });
            fireEvent.pointerLeave(svg);
            expect(statValues(container)).toEqual(["5:33 min/km", "0.15 km", "0:50"]);
            // The guide line and the map pointer stay too.
            expect(container.querySelector(".hoverLine")).toBeInTheDocument();
            expect(container.querySelector(".pointer")).toBeInTheDocument();
        });

        it("keeps the last position when the mouse moves off the plot area onto the axes", () => {
            const { container } = renderChart(route);
            const svg = graph(container);
            fireEvent.pointerMove(svg, { clientX: 70 + 355, clientY: 100 });
            fireEvent.pointerMove(svg, { clientX: 10, clientY: 100 });
            expect(statValues(container)).toEqual(["5:33 min/km", "0.15 km", "0:50"]);
        });

        it("shows the totals of the whole run when not zoomed", () => {
            const { container } = renderChart(route);
            expect(sectionValues(container)).toEqual(["5:33 min/km", "0.30 km", "1:40"]);
            expect(container.querySelector(".visibleSection")).toBeInTheDocument();
        });

        it("updates the visible-section totals after zooming in", () => {
            const { container } = renderChart(route);
            fireEvent.wheel(graph(container), { clientX: 70 + 355, clientY: 100, deltaY: -1000 });
            const [pace, distance, time] = sectionValues(container);
            // Steady run, so the average pace stays the same while the section gets shorter.
            expect(pace).toBe("5:33 min/km");
            expect(parseFloat(distance)).toBeLessThan(0.3);
            expect(time).not.toBe("1:40");
        });
    });
});
