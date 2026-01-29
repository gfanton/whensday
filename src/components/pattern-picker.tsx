"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import type { DatePattern } from "@/db/types";
import { WEEKDAY_NAMES, calculateWeekdaySpan } from "@/lib/date-groups";

export type { DatePattern };

type PatternPickerProps = {
  pattern: DatePattern;
  onPatternChange: (pattern: DatePattern) => void;
};

type PresetType = "weekend" | "long-weekend" | "week" | "custom" | "flexible";

// ---- Preset Definitions

const LONG_WEEKEND_PRESETS = [
  { label: "Fri-Sun", startDay: 5, endDay: 0 }, // 3 days
  { label: "Fri-Mon", startDay: 5, endDay: 1 }, // 4 days
] as const;

// Display order for mini week calendar: Mon-Sun instead of Sun-Sat
const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const; // Mon, Tue, Wed, Thu, Fri, Sat, Sun

// ---- Mini Week Calendar

type WeekCalendarProps = {
  startDay: number;
  endDay: number;
  onSelect: (startDay: number, endDay: number) => void;
};

function WeekCalendar({ startDay, endDay, onSelect }: WeekCalendarProps): ReactElement {
  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  function handleDayClick(day: number): void {
    if (selectionStart === null) {
      // First click: set start day
      setSelectionStart(day);
    } else {
      // Second click: set end day and complete selection
      onSelect(selectionStart, day);
      setSelectionStart(null);
    }
  }

  function isInRange(day: number): boolean {
    if (selectionStart !== null) {
      // While selecting, highlight from selectionStart to current hover
      return day === selectionStart;
    }
    // When not selecting, highlight the actual range
    const span = calculateWeekdaySpan(startDay, endDay);
    for (let i = 0; i < span; i++) {
      if ((startDay + i) % 7 === day) return true;
    }
    return false;
  }

  function isStart(day: number): boolean {
    if (selectionStart !== null) {
      return day === selectionStart;
    }
    return day === startDay;
  }

  function isEnd(day: number): boolean {
    if (selectionStart !== null) {
      return false;
    }
    return day === endDay;
  }

  const span = calculateWeekdaySpan(startDay, endDay);
  const startName = WEEKDAY_NAMES[startDay];
  const endName = WEEKDAY_NAMES[endDay];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_DISPLAY_ORDER.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => handleDayClick(day)}
            className={`
              px-2 py-2 text-xs font-medium rounded transition-colors text-center
              ${isInRange(day) ? "bg-blue text-crust" : "bg-surface0 text-subtext1 hover:bg-surface1"}
              ${isStart(day) ? "ring-2 ring-blue ring-offset-1 ring-offset-base" : ""}
              ${isEnd(day) && !isStart(day) ? "ring-2 ring-green ring-offset-1 ring-offset-base" : ""}
            `}
          >
            {WEEKDAY_NAMES[day]}
          </button>
        ))}
      </div>
      <p className="text-xs text-overlay1 text-center">
        {selectionStart !== null ? (
          `Select end day (started at ${WEEKDAY_NAMES[selectionStart]})`
        ) : (
          `${startName} to ${endName} (${span} day${span > 1 ? "s" : ""})`
        )}
      </p>
    </div>
  );
}

// ---- Main Component

export function PatternPicker({
  pattern,
  onPatternChange,
}: PatternPickerProps): ReactElement {
  // Determine the current preset type from the pattern
  function getCurrentPreset(): PresetType {
    if (pattern.type === "weekend") return "weekend";
    if (pattern.type === "flexible") return "flexible";
    if (pattern.type === "weekday-range") {
      // Check if it matches long-weekend presets
      const isLongWeekend = LONG_WEEKEND_PRESETS.some(
        (p) => p.startDay === pattern.startDay && p.endDay === pattern.endDay
      );
      if (isLongWeekend) return "long-weekend";
      // Check if it's Mon-Sun (week)
      if (pattern.startDay === 1 && pattern.endDay === 0) return "week";
      return "custom";
    }
    return "flexible";
  }

  const [activePreset, setActivePreset] = useState<PresetType>(getCurrentPreset());
  const [longWeekendIndex, setLongWeekendIndex] = useState<number>(() => {
    if (pattern.type === "weekday-range") {
      const idx = LONG_WEEKEND_PRESETS.findIndex(
        (p) => p.startDay === pattern.startDay && p.endDay === pattern.endDay
      );
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  // Get custom weekday range from pattern or default to Mon-Fri
  const [customRange, setCustomRange] = useState<{ startDay: number; endDay: number }>(() => {
    if (pattern.type === "weekday-range") {
      return { startDay: pattern.startDay, endDay: pattern.endDay };
    }
    return { startDay: 1, endDay: 5 }; // Default Mon-Fri
  });

  function handlePresetSelect(preset: PresetType): void {
    setActivePreset(preset);
    switch (preset) {
      case "weekend":
        onPatternChange({ type: "weekend" });
        break;
      case "long-weekend": {
        const current = LONG_WEEKEND_PRESETS[longWeekendIndex];
        if (current) {
          onPatternChange({
            type: "weekday-range",
            startDay: current.startDay,
            endDay: current.endDay,
          });
        }
        break;
      }
      case "week":
        onPatternChange({ type: "weekday-range", startDay: 1, endDay: 0 }); // Mon-Sun
        break;
      case "custom":
        onPatternChange({
          type: "weekday-range",
          startDay: customRange.startDay,
          endDay: customRange.endDay,
        });
        break;
      case "flexible":
        onPatternChange({ type: "flexible" });
        break;
    }
  }

  function handleLongWeekendChange(index: number): void {
    setLongWeekendIndex(index);
    const preset = LONG_WEEKEND_PRESETS[index];
    if (preset && activePreset === "long-weekend") {
      onPatternChange({
        type: "weekday-range",
        startDay: preset.startDay,
        endDay: preset.endDay,
      });
    }
  }

  function handleCustomRangeChange(startDay: number, endDay: number): void {
    setCustomRange({ startDay, endDay });
    if (activePreset === "custom") {
      onPatternChange({ type: "weekday-range", startDay, endDay });
    }
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
          onClick={() => handlePresetSelect("weekend")}
          className={`${buttonBase} ${activePreset === "weekend" ? buttonActive : buttonInactive}`}
        >
          Weekend
        </button>

        <button
          type="button"
          onClick={() => handlePresetSelect("long-weekend")}
          className={`${buttonBase} ${activePreset === "long-weekend" ? buttonActive : buttonInactive}`}
        >
          Long Weekend
        </button>

        <button
          type="button"
          onClick={() => handlePresetSelect("week")}
          className={`${buttonBase} ${activePreset === "week" ? buttonActive : buttonInactive}`}
        >
          Week
        </button>

        <button
          type="button"
          onClick={() => handlePresetSelect("custom")}
          className={`${buttonBase} ${activePreset === "custom" ? buttonActive : buttonInactive}`}
        >
          Custom
        </button>

        <button
          type="button"
          onClick={() => handlePresetSelect("flexible")}
          className={`${buttonBase} ${activePreset === "flexible" ? buttonActive : buttonInactive}`}
        >
          Flexible
        </button>
      </div>

      {/* Long Weekend sub-options */}
      {activePreset === "long-weekend" && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-overlay1">Duration:</span>
          <div className="flex gap-2">
            {LONG_WEEKEND_PRESETS.map((preset, idx) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleLongWeekendChange(idx)}
                className={`px-3 py-1 rounded ${
                  longWeekendIndex === idx
                    ? "bg-blue text-crust"
                    : "bg-surface0 text-subtext1 hover:bg-surface1"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom range mini calendar */}
      {activePreset === "custom" && (
        <div className="pt-2">
          <WeekCalendar
            startDay={customRange.startDay}
            endDay={customRange.endDay}
            onSelect={handleCustomRangeChange}
          />
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-overlay1">
        {activePreset === "weekend" &&
          "Select a date range. Each weekend (Sat-Sun) becomes a voting option."}
        {activePreset === "long-weekend" &&
          `Select a date range. Each ${LONG_WEEKEND_PRESETS[longWeekendIndex]?.label ?? "Fri-Sun"} period becomes a voting option.`}
        {activePreset === "week" &&
          "Select a date range. Each complete week (Mon-Sun) becomes a voting option."}
        {activePreset === "custom" &&
          "Select a date range. Click two weekdays above to define your pattern."}
        {activePreset === "flexible" &&
          "Select dates. Each individual day becomes a voting option."}
      </p>
    </div>
  );
}
