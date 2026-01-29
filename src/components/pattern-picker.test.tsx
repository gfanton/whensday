import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PatternPicker, type DatePattern } from "./pattern-picker";

describe("PatternPicker", () => {
  const defaultProps = {
    pattern: { type: "flexible" } as DatePattern,
    onPatternChange: vi.fn(),
  };

  describe("renders all pattern buttons", () => {
    it("displays all five pattern preset options", () => {
      render(<PatternPicker {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Weekend" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Long Weekend" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Week" })).toBeInTheDocument();
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

    it("calls onPatternChange with long-weekend pattern (Fri-Sun default)", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Long Weekend" }));

      expect(onPatternChange).toHaveBeenCalledWith({
        type: "weekday-range",
        startDay: 5,
        endDay: 0,
      });
    });

    it("calls onPatternChange with week pattern (Mon-Sun)", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Week" }));

      expect(onPatternChange).toHaveBeenCalledWith({
        type: "weekday-range",
        startDay: 1,
        endDay: 0,
      });
    });

    it("calls onPatternChange with custom pattern (default Mon-Fri)", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Custom" }));

      expect(onPatternChange).toHaveBeenCalledWith({
        type: "weekday-range",
        startDay: 1,
        endDay: 5,
      });
    });

    it("calls onPatternChange with flexible pattern", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Flexible" }));

      expect(onPatternChange).toHaveBeenCalledWith({ type: "flexible" });
    });
  });

  describe("long-weekend duration options", () => {
    it("shows duration options when long-weekend is selected", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Long Weekend" }));

      expect(screen.getByText("Duration:")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Fri-Sun" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Fri-Mon" })).toBeInTheDocument();
    });

    it("hides duration options for other presets", () => {
      render(<PatternPicker {...defaultProps} />);

      expect(screen.queryByText("Duration:")).not.toBeInTheDocument();
    });

    it("calls onPatternChange when duration is changed to Fri-Mon", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      // First select long weekend
      await userEvent.click(screen.getByRole("button", { name: "Long Weekend" }));
      onPatternChange.mockClear();

      // Then change duration to Fri-Mon
      await userEvent.click(screen.getByRole("button", { name: "Fri-Mon" }));

      expect(onPatternChange).toHaveBeenCalledWith({
        type: "weekday-range",
        startDay: 5,
        endDay: 1,
      });
    });
  });

  describe("custom weekday calendar", () => {
    it("shows mini week calendar when custom is selected", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Custom" }));

      // Should show all weekday buttons
      expect(screen.getByRole("button", { name: "Sun" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Mon" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Tue" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Wed" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Thu" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Fri" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sat" })).toBeInTheDocument();
    });

    it("hides mini week calendar for other presets", () => {
      render(<PatternPicker {...defaultProps} />);

      expect(screen.queryByRole("button", { name: "Sun" })).not.toBeInTheDocument();
    });

    it("allows selecting custom weekday range", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      // Select custom preset
      await userEvent.click(screen.getByRole("button", { name: "Custom" }));
      onPatternChange.mockClear();

      // Select Wed as start day
      await userEvent.click(screen.getByRole("button", { name: "Wed" }));

      // Select Sat as end day
      await userEvent.click(screen.getByRole("button", { name: "Sat" }));

      expect(onPatternChange).toHaveBeenCalledWith({
        type: "weekday-range",
        startDay: 3, // Wed
        endDay: 6, // Sat
      });
    });
  });

  describe("help text", () => {
    it("shows appropriate help text for weekend preset", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Weekend" }));

      expect(screen.getByText(/Each weekend \(Sat-Sun\) becomes a voting option/)).toBeInTheDocument();
    });

    it("shows appropriate help text for flexible preset", () => {
      render(<PatternPicker {...defaultProps} />);

      expect(screen.getByText(/Each individual day becomes a voting option/)).toBeInTheDocument();
    });

    it("shows appropriate help text for week preset", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Week" }));

      expect(screen.getByText(/Each complete week \(Mon-Sun\) becomes a voting option/)).toBeInTheDocument();
    });

    it("shows appropriate help text for long weekend preset", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Long Weekend" }));

      expect(screen.getByText(/Each Fri-Sun period becomes a voting option/)).toBeInTheDocument();
    });

    it("shows appropriate help text for custom preset", async () => {
      const onPatternChange = vi.fn();
      render(<PatternPicker {...defaultProps} onPatternChange={onPatternChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Custom" }));

      expect(screen.getByText(/Click two weekdays above to define your pattern/)).toBeInTheDocument();
    });
  });

  describe("initial state from pattern prop", () => {
    it("initializes with weekend preset when pattern is weekend", () => {
      render(
        <PatternPicker
          pattern={{ type: "weekend" }}
          onPatternChange={vi.fn()}
        />
      );

      const weekendBtn = screen.getByRole("button", { name: "Weekend" });
      expect(weekendBtn.className).toContain("bg-blue");
    });

    it("initializes with long-weekend preset for Fri-Sun pattern", () => {
      render(
        <PatternPicker
          pattern={{ type: "weekday-range", startDay: 5, endDay: 0 }}
          onPatternChange={vi.fn()}
        />
      );

      const longWeekendBtn = screen.getByRole("button", { name: "Long Weekend" });
      expect(longWeekendBtn.className).toContain("bg-blue");
    });

    it("initializes with long-weekend preset for Fri-Mon pattern", () => {
      render(
        <PatternPicker
          pattern={{ type: "weekday-range", startDay: 5, endDay: 1 }}
          onPatternChange={vi.fn()}
        />
      );

      const longWeekendBtn = screen.getByRole("button", { name: "Long Weekend" });
      expect(longWeekendBtn.className).toContain("bg-blue");

      // Duration selector should show Fri-Mon active
      const friMonBtn = screen.getByRole("button", { name: "Fri-Mon" });
      expect(friMonBtn.className).toContain("bg-blue");
    });

    it("initializes with week preset for Mon-Sun pattern", () => {
      render(
        <PatternPicker
          pattern={{ type: "weekday-range", startDay: 1, endDay: 0 }}
          onPatternChange={vi.fn()}
        />
      );

      const weekBtn = screen.getByRole("button", { name: "Week" });
      expect(weekBtn.className).toContain("bg-blue");
    });

    it("initializes with custom preset for non-standard weekday-range", () => {
      render(
        <PatternPicker
          pattern={{ type: "weekday-range", startDay: 2, endDay: 4 }}
          onPatternChange={vi.fn()}
        />
      );

      const customBtn = screen.getByRole("button", { name: "Custom" });
      expect(customBtn.className).toContain("bg-blue");
    });
  });
});
