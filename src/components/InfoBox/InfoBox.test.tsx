import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InfoBox } from ".";

// The browser's own dialog behaviour (backdrop, focus trapping, Esc) isn't in jsdom;
// see the stand-in in src/test/setup.ts. These tests cover the component's own logic.
describe("InfoBox", () => {
    afterEach(() => {
        cleanup();
    });

    const dialog = () => document.querySelector("dialog")!;

    it("opens and closes the dialog with the open prop", () => {
        const { rerender } = render(<InfoBox open={false} onClose={() => {}} closeLabel="Close">Help</InfoBox>);
        expect(dialog().open).toBe(false);

        rerender(<InfoBox open={true} onClose={() => {}} closeLabel="Close">Help</InfoBox>);
        expect(dialog().open).toBe(true);
        expect(screen.getByText("Help")).toBeInTheDocument();

        rerender(<InfoBox open={false} onClose={() => {}} closeLabel="Close">Help</InfoBox>);
        expect(dialog().open).toBe(false);
    });

    it("shows the close label on the button and calls onClose when it's clicked", () => {
        const onClose = vi.fn();
        render(<InfoBox open={true} onClose={onClose} closeLabel="Close">Help</InfoBox>);
        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose on a backdrop click but not on a click inside the content", () => {
        const onClose = vi.fn();
        render(<InfoBox open={true} onClose={onClose} closeLabel="Close">Help</InfoBox>);
        fireEvent.click(screen.getByText("Help"));
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(dialog());
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when the dialog closes by itself, e.g. on Esc", () => {
        const onClose = vi.fn();
        render(<InfoBox open={true} onClose={onClose} closeLabel="Close">Help</InfoBox>);
        dialog().close();
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
