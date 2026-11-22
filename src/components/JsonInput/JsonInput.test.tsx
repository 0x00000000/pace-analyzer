import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { JsonInput } from ".";

describe("JsonInput", () => {
    afterEach(() => {
        cleanup();
    });

    it("shows no error by default", () => {
        render(<JsonInput label="Activity" value="" onChange={() => {}} />);
        expect(screen.queryByRole("alert")).toBeNull();
        expect(screen.getByLabelText("Activity")).not.toHaveAttribute("aria-invalid");
    });

    it("shows the error and links it to the textarea", () => {
        render(<JsonInput label="Activity" value="x" onChange={() => {}} error="This isn't valid JSON" />);
        const alert = screen.getByRole("alert");
        expect(alert).toHaveTextContent("This isn't valid JSON");
        const textarea = screen.getByLabelText("Activity");
        expect(textarea).toHaveAttribute("aria-invalid", "true");
        expect(textarea).toHaveAttribute("aria-describedby", alert.id);
    });
});
