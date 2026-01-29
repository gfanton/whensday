"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import type { DatePattern } from "@/db/types";

export type { DatePattern };

type PatternPickerProps = {
  pattern: DatePattern;
  onPatternChange: (pattern: DatePattern) => void;
};

type PatternType = DatePattern["type"];

export function PatternPicker({
  pattern,
  onPatternChange,
}: PatternPickerProps): ReactElement {
  const [customDays, setCustomDays] = useState(
    pattern.type === "custom" ? pattern.days : 5
  );
  const [longWeekendDays, setLongWeekendDays] = useState<3 | 4>(
    pattern.type === "long-weekend" ? pattern.days : 3
  );

  function handlePatternSelect(type: PatternType): void {
    switch (type) {
      case "weekend":
        onPatternChange({ type: "weekend" });
        break;
      case "long-weekend":
        onPatternChange({ type: "long-weekend", days: longWeekendDays });
        break;
      case "week":
        onPatternChange({ type: "week" });
        break;
      case "two-weeks":
        onPatternChange({ type: "two-weeks" });
        break;
      case "custom":
        onPatternChange({ type: "custom", days: customDays });
        break;
      case "flexible":
        onPatternChange({ type: "flexible" });
        break;
    }
  }

  function handleCustomDaysChange(days: number): void {
    const clamped = Math.max(1, Math.min(31, days));
    setCustomDays(clamped);
    if (pattern.type === "custom") {
      onPatternChange({ type: "custom", days: clamped });
    }
  }

  function handleLongWeekendChange(days: 3 | 4): void {
    setLongWeekendDays(days);
    if (pattern.type === "long-weekend") {
      onPatternChange({ type: "long-weekend", days });
    }
  }

  function isSelected(type: PatternType): boolean {
    return pattern.type === type;
  }

  const buttonBase =
    "px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap";
  const buttonActive = "bg-blue text-crust";
  const buttonInactive = "bg-surface0 text-subtext1 hover:bg-surface1";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handlePatternSelect("weekend")}
          className={`${buttonBase} ${isSelected("weekend") ? buttonActive : buttonInactive}`}
        >
          Weekend
        </button>

        <button
          type="button"
          onClick={() => handlePatternSelect("long-weekend")}
          className={`${buttonBase} ${isSelected("long-weekend") ? buttonActive : buttonInactive}`}
        >
          Long Weekend
        </button>

        <button
          type="button"
          onClick={() => handlePatternSelect("week")}
          className={`${buttonBase} ${isSelected("week") ? buttonActive : buttonInactive}`}
        >
          Week
        </button>

        <button
          type="button"
          onClick={() => handlePatternSelect("two-weeks")}
          className={`${buttonBase} ${isSelected("two-weeks") ? buttonActive : buttonInactive}`}
        >
          Two Weeks
        </button>

        <button
          type="button"
          onClick={() => handlePatternSelect("custom")}
          className={`${buttonBase} ${isSelected("custom") ? buttonActive : buttonInactive}`}
        >
          Custom
        </button>

        <button
          type="button"
          onClick={() => handlePatternSelect("flexible")}
          className={`${buttonBase} ${isSelected("flexible") ? buttonActive : buttonInactive}`}
        >
          Flexible
        </button>
      </div>

      {/* Additional options for certain patterns */}
      {pattern.type === "long-weekend" && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-overlay1">Duration:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleLongWeekendChange(3)}
              className={`px-3 py-1 rounded ${longWeekendDays === 3 ? "bg-blue text-crust" : "bg-surface0 text-subtext1 hover:bg-surface1"}`}
            >
              3 days
            </button>
            <button
              type="button"
              onClick={() => handleLongWeekendChange(4)}
              className={`px-3 py-1 rounded ${longWeekendDays === 4 ? "bg-blue text-crust" : "bg-surface0 text-subtext1 hover:bg-surface1"}`}
            >
              4 days
            </button>
          </div>
        </div>
      )}

      {pattern.type === "custom" && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-overlay1">Number of days:</span>
          <input
            type="number"
            min={1}
            max={31}
            value={customDays}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              if (!Number.isNaN(parsed)) {
                handleCustomDaysChange(parsed);
              }
            }}
            className="w-20 rounded-md border border-surface1 bg-surface0 px-3 py-1 text-text focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
          />
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-overlay1">
        {pattern.type === "weekend" &&
          "Select a date range. Each weekend (Sat-Sun) within the range becomes a voting option."}
        {pattern.type === "long-weekend" &&
          `Select a date range. Each ${longWeekendDays}-day period becomes a voting option.`}
        {pattern.type === "week" &&
          "Select a date range. Each complete week becomes a voting option."}
        {pattern.type === "two-weeks" &&
          "Select a date range. Each complete fortnight becomes a voting option."}
        {pattern.type === "custom" &&
          `Select a date range. Each ${customDays}-day period becomes a voting option.`}
        {pattern.type === "flexible" &&
          "Select a date range or individual dates. Each day becomes a voting option."}
      </p>
    </div>
  );
}
