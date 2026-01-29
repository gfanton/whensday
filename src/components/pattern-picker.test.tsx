import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PatternPicker, type DatePattern } from "./pattern-picker";

describe("PatternPicker", () => {
  const defaultProps = {
    pattern: { type: "flexible" } as DatePattern,
    onPatternChange: vi.fn(),
  };

  describe("renders all pattern buttons", () => {
    it("displays all six pattern options", () => {
      render(<PatternPicker {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Weekend" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Long Weekend" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Week" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Two Weeks" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Flexible" })).toBeInTheDocument();
    });
  });

  describe("calls onPatternChange on click", () => {
    it("calls onPatternChange with weekend pattern", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Weekend" }));

      expect(onPatternChange).toHaveBeenCalledWith({ type: "weekend" });
    });

    it("calls onPatternChange with long-weekend pattern", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Long Weekend" }));

      expect(onPatternChange).toHaveBeenCalledWith({ type: "long-weekend", days: 3 });
    });

    it("calls onPatternChange with week pattern", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Week" }));

      expect(onPatternChange).toHaveBeenCalledWith({ type: "week" });
    });

    it("calls onPatternChange with two-weeks pattern", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Two Weeks" }));

      expect(onPatternChange).toHaveBeenCalledWith({ type: "two-weeks" });
    });

    it("calls onPatternChange with custom pattern", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Custom" }));

      expect(onPatternChange).toHaveBeenCalledWith({ type: "custom", days: 5 });
    });

    it("calls onPatternChange with flexible pattern", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Flexible" }));

      expect(onPatternChange).toHaveBeenCalledWith({ type: "flexible" });
    });
  });

  describe("long-weekend duration options", () => {
    it("shows duration options when long-weekend is selected", () => {
      render(
        <PatternPicker
          pattern={{ type: "long-weekend", days: 3 }}
          onPatternChange={vi.fn()}
        />
      );

      expect(screen.getByText("Duration:")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "3 days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "4 days" })).toBeInTheDocument();
    });

    it("hides duration options for other patterns", () => {
      render(<PatternPicker {...defaultProps} />);

      expect(screen.queryByText("Duration:")).not.toBeInTheDocument();
    });

    it("calls onPatternChange when duration is changed", async () => {
      const onPatternChange = vi.fn();
      render(
        <PatternPicker
          pattern={{ type: "long-weekend", days: 3 }}
          onPatternChange={onPatternChange}
        />
      );

      await userEvent.click(screen.getByRole("button", { name: "4 days" }));

      expect(onPatternChange).toHaveBeenCalledWith({ type: "long-weekend", days: 4 });
    });
  });

  describe("custom days input", () => {
    it("shows number input when custom pattern is selected", () => {
      render(
        <PatternPicker
          pattern={{ type: "custom", days: 5 }}
          onPatternChange={vi.fn()}
        />
      );

      expect(screen.getByText("Number of days:")).toBeInTheDocument();
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("hides number input for other patterns", () => {
      render(<PatternPicker {...defaultProps} />);

      expect(screen.queryByText("Number of days:")).not.toBeInTheDocument();
    });

    it("calls onPatternChange when days input is changed", () => {
      const onPatternChange = vi.fn();
      render(
        <PatternPicker
          pattern={{ type: "custom", days: 5 }}
          onPatternChange={onPatternChange}
        />
      );

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "10" } });

      expect(onPatternChange).toHaveBeenCalledWith({ type: "custom", days: 10 });
    });

    it("clamps custom days to valid range", () => {
      const onPatternChange = vi.fn();
      render(
        <PatternPicker
          pattern={{ type: "custom", days: 5 }}
          onPatternChange={onPatternChange}
        />
      );

      const input = screen.getByRole("spinbutton");

      // Test minimum clamping
      fireEvent.change(input, { target: { value: "0" } });
      expect(onPatternChange).toHaveBeenCalledWith({ type: "custom", days: 1 });

      onPatternChange.mockClear();

      // Test maximum clamping
      fireEvent.change(input, { target: { value: "50" } });
      expect(onPatternChange).toHaveBeenCalledWith({ type: "custom", days: 31 });
    });

    it("ignores NaN input values", () => {
      const onPatternChange = vi.fn();
      render(
        <PatternPicker
          pattern={{ type: "custom", days: 5 }}
          onPatternChange={onPatternChange}
        />
      );

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "" } });

      // Should not call onPatternChange with NaN
      expect(onPatternChange).not.toHaveBeenCalled();
    });
  });

  describe("help text", () => {
    it("shows appropriate help text for weekend pattern", () => {
      render(
        <PatternPicker
          pattern={{ type: "weekend" }}
          onPatternChange={vi.fn()}
        />
      );

      expect(screen.getByText(/Each weekend \(Sat-Sun\) within the range/)).toBeInTheDocument();
    });

    it("shows appropriate help text for flexible pattern", () => {
      render(<PatternPicker {...defaultProps} />);

      expect(screen.getByText(/Each day becomes a voting option/)).toBeInTheDocument();
    });

    it("shows appropriate help text for week pattern", () => {
      render(
        <PatternPicker
          pattern={{ type: "week" }}
          onPatternChange={vi.fn()}
        />
      );

      expect(screen.getByText(/Each complete week becomes a voting option/)).toBeInTheDocument();
    });
  });

  describe("initial state", () => {
    it("initializes custom days from pattern prop", () => {
      render(
        <PatternPicker
          pattern={{ type: "custom", days: 10 }}
          onPatternChange={vi.fn()}
        />
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveValue(10);
    });

    it("initializes long-weekend days from pattern prop", () => {
      const onPatternChange = vi.fn();
      render(
        <PatternPicker
          pattern={{ type: "long-weekend", days: 4 }}
          onPatternChange={onPatternChange}
        />
      );

      // The 4 days button should have the active class (bg-blue)
      const button4Days = screen.getByRole("button", { name: "4 days" });
      expect(button4Days.className).toContain("bg-blue");
    });
  });
});
