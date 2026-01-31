"use client";

import type { ReactElement } from "react";
import { useState, useMemo, useEffect, useRef } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format, eachDayOfInterval, isToday } from "date-fns";
import "react-day-picker/style.css";
import { PatternPicker } from "./pattern-picker";
import {
  generateDateGroups,
  getRemainingDays,
  type DateGroup,
} from "@/lib/date-groups";
import type { DatePattern } from "@/db/types";

type CalendarPickerProps = {
  // For flexible mode: flat string array
  // For pattern mode: grouped string array
  selectedDates: string[] | string[][];
  onDatesChange: (dates: string[] | string[][], pattern: DatePattern) => void;
};

type SelectionMode = "single" | "range";

type CalendarModifiers = {
  evenGroup?: Date[];
  oddGroup?: Date[];
  excludedGroup?: Date[];
  rangeNonGroup?: Date[];
  today?: (date: Date) => boolean;
};

export function CalendarPicker({
  selectedDates,
  onDatesChange,
}: CalendarPickerProps): ReactElement {
  const [pattern, setPattern] = useState<DatePattern>({ type: "flexible" });
  const [mode, setMode] = useState<SelectionMode>("range");
  const [range, setRange] = useState<DateRange | undefined>();
  const [excludedGroups, setExcludedGroups] = useState<Set<number>>(new Set());

  const isPatternMode = pattern.type !== "flexible";

  // Generate groups when range is selected in pattern mode
  const dateGroups = useMemo((): DateGroup[] => {
    if (!isPatternMode || !range?.from || !range?.to) {
      return [];
    }
    return generateDateGroups(pattern, { start: range.from, end: range.to });
  }, [isPatternMode, pattern, range]);

  // Calculate remaining days for warning
  const remainingDays = useMemo((): number => {
    if (!isPatternMode || !range?.from || !range?.to) {
      return 0;
    }
    return getRemainingDays(pattern, { start: range.from, end: range.to });
  }, [isPatternMode, pattern, range]);

  // Create a set of all selected dates for calendar highlighting
  const selectedDateSet = useMemo((): Set<string> => {
    if (isPatternMode) {
      // Flatten grouped dates for display
      return new Set(dateGroups.flatMap((g) => g.dates));
    }
    // Flat array for flexible mode
    return new Set(Array.isArray(selectedDates[0]) ? [] : (selectedDates as string[]));
  }, [isPatternMode, dateGroups, selectedDates]);

  // ---- Handlers

  function handlePatternChange(newPattern: DatePattern): void {
    setPattern(newPattern);
    setExcludedGroups(new Set()); // Reset exclusions when pattern changes

    // Keep range, regenerate groups with new pattern
    if (range?.from && range?.to) {
      if (newPattern.type === "flexible") {
        const allDates = eachDayOfInterval({ start: range.from, end: range.to });
        onDatesChange(allDates.map((d) => format(d, "yyyy-MM-dd")), newPattern);
      } else {
        const groups = generateDateGroups(newPattern, { start: range.from, end: range.to });
        onDatesChange(groups.map((g) => g.dates), newPattern);
      }
    } else {
      onDatesChange([], newPattern);
    }
  }

  function handleToggleGroup(index: number): void {
    setExcludedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  // Sync excluded groups changes to parent
  // This runs after excludedGroups state update, avoiding setState-during-render
  const prevExcludedRef = useRef<Set<number>>(excludedGroups);
  useEffect(() => {
    if (prevExcludedRef.current !== excludedGroups && isPatternMode && dateGroups.length > 0) {
      const filteredDates = dateGroups
        .filter((_, i) => !excludedGroups.has(i))
        .map((g) => g.dates);
      onDatesChange(filteredDates, pattern);
    }
    prevExcludedRef.current = excludedGroups;
  }, [excludedGroups, isPatternMode, dateGroups, pattern, onDatesChange]);

  function handleRangeSelect(newRange: DateRange | undefined): void {
    setRange(newRange);
    setExcludedGroups(new Set()); // Reset exclusions when range changes

    if (!newRange?.from) {
      onDatesChange([], pattern);
      return;
    }

    if (!newRange.to) {
      // Single date selected, treat as start of range
      if (isPatternMode) {
        onDatesChange([], pattern);
      } else {
        onDatesChange([format(newRange.from, "yyyy-MM-dd")], pattern);
      }
      return;
    }

    if (isPatternMode) {
      // Generate groups and pass as grouped dates
      const groups = generateDateGroups(pattern, {
        start: newRange.from,
        end: newRange.to,
      });
      const groupedDates = groups.map((g) => g.dates);
      onDatesChange(groupedDates, pattern);
    } else {
      // Flexible range mode: flat array
      const allDates = eachDayOfInterval({
        start: newRange.from,
        end: newRange.to,
      });
      const formatted = allDates.map((d) => format(d, "yyyy-MM-dd"));
      onDatesChange(formatted, pattern);
    }
  }

  function handleSingleSelect(dates: Date[] | undefined): void {
    if (!dates) {
      onDatesChange([], pattern);
      return;
    }
    const formatted = dates.map((d) => format(d, "yyyy-MM-dd")).sort();
    onDatesChange(formatted, pattern);
  }

  function handleModeChange(newMode: SelectionMode): void {
    setMode(newMode);
    setRange(undefined);
    onDatesChange([], pattern);
  }

  function handleClearDates(): void {
    setRange(undefined);
    onDatesChange([], pattern);
  }

  // ---- Calendar Styling

  const dayPickerClassNames = useMemo(() => ({
    root: "rdp-root",
    months: "flex flex-col sm:flex-row gap-4 px-10",
    month: "space-y-4",
    month_caption: "flex justify-center items-center h-10",
    caption_label: "text-sm font-medium text-text",
    nav: "flex items-center gap-1",
    button_previous:
      "absolute left-0 p-2 rounded-md hover:bg-surface1 transition-colors",
    button_next:
      "absolute right-0 p-2 rounded-md hover:bg-surface1 transition-colors",
    chevron: "fill-lavender",
    weekdays: "flex",
    weekday: "w-9 text-center text-xs font-medium text-overlay1 py-2",
    week: "flex",
    day: "w-9 h-9 text-center text-sm p-0",
    day_button:
      "w-full h-full rounded-md text-text font-medium hover:bg-surface0 focus:outline-none focus:ring-2 focus:ring-blue disabled:text-surface2 disabled:font-normal disabled:hover:bg-transparent",
    selected: "bg-blue [&>button]:text-crust hover:bg-sapphire",
    range_start: "rounded-l-md bg-blue [&>button]:text-crust",
    range_end: "rounded-r-md bg-blue [&>button]:text-crust",
    // In pattern mode, clear range_middle so group colors take precedence
    range_middle: isPatternMode ? "" : "bg-surface1 rounded-none",
    today: "[&>button]:text-peach [&>button]:font-bold",
    disabled: "[&>button]:text-surface2 [&>button]:font-normal",
  }), [isPatternMode]);

  // Custom day content for pattern mode (alternating group colors)
  const modifiers = useMemo((): CalendarModifiers => {
    if (!isPatternMode || dateGroups.length === 0) {
      return {};
    }

    const evenGroup: Date[] = [];
    const oddGroup: Date[] = [];
    const excludedDates: Date[] = [];
    const rangeNonGroup: Date[] = [];

    // Collect all dates that are part of voting groups
    const allGroupDateSet = new Set<string>();
    for (const group of dateGroups) {
      for (const d of group.dates) {
        allGroupDateSet.add(d);
      }
    }

    for (let i = 0; i < dateGroups.length; i++) {
      const group = dateGroups[i];
      if (!group) continue;
      const dates = group.dates.map((d) => new Date(d + "T00:00:00"));

      if (excludedGroups.has(i)) {
        excludedDates.push(...dates);
      } else if (i % 2 === 0) {
        evenGroup.push(...dates);
      } else {
        oddGroup.push(...dates);
      }
    }

    // Calculate days in range but NOT in any voting group
    if (range?.from && range?.to) {
      const allRangeDates = eachDayOfInterval({ start: range.from, end: range.to });
      for (const d of allRangeDates) {
        const dateStr = format(d, "yyyy-MM-dd");
        if (!allGroupDateSet.has(dateStr)) {
          rangeNonGroup.push(d);
        }
      }
    }

    return {
      evenGroup,
      oddGroup,
      excludedGroup: excludedDates,
      rangeNonGroup,
      today: (date: Date) => isToday(date),
    };
  }, [isPatternMode, dateGroups, excludedGroups, range]);

  const modifiersClassNames = useMemo((): Record<string, string> | undefined => {
    if (!isPatternMode) {
      return undefined;
    }
    return {
      evenGroup: "bg-blue [&>button]:text-crust hover:bg-blue/80",
      oddGroup: "bg-sapphire [&>button]:text-crust hover:bg-sapphire/80",
      excludedGroup: "bg-surface1 [&>button]:text-overlay0 opacity-50",
      rangeNonGroup: "bg-surface0/50 [&>button]:text-overlay1 rounded-none",
      today: "[&>button]:text-peach [&>button]:font-bold",
    };
  }, [isPatternMode]);

  // ---- Format Helpers

  function formatRangeDisplay(): string {
    if (!range?.from) return "";
    const start = range.from;
    const end = range.to ?? range.from;
    return `${format(start, "MMM d, yyyy")} → ${format(end, "MMM d, yyyy")}`;
  }

  function getTotalDaysSelected(): number {
    if (isPatternMode) {
      return dateGroups.reduce((sum, g) => sum + g.dates.length, 0);
    }
    return selectedDateSet.size;
  }

  // ---- Render

  return (
    <div className="space-y-4">
      {/* Pattern Picker */}
      <PatternPicker pattern={pattern} onPatternChange={handlePatternChange} />

      {/* Mode Toggle - only show in flexible mode */}
      {!isPatternMode && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleModeChange("range")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "range"
                ? "bg-blue text-crust"
                : "bg-surface0 text-subtext1 hover:bg-surface1"
            }`}
          >
            Date Range
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("single")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "single"
                ? "bg-blue text-crust"
                : "bg-surface0 text-subtext1 hover:bg-surface1"
            }`}
          >
            Individual Dates
          </button>
        </div>
      )}

      {/* Calendar */}
      <div className="border border-surface1 rounded-lg p-4 bg-mantle">
        {isPatternMode || mode === "range" ? (
          <DayPicker
            mode="range"
            selected={range}
            onSelect={handleRangeSelect}
            numberOfMonths={2}
            weekStartsOn={1}
            disabled={{ before: new Date() }}
            modifiers={isPatternMode ? modifiers : undefined}
            modifiersClassNames={modifiersClassNames}
            classNames={dayPickerClassNames}
          />
        ) : (
          <DayPicker
            mode="multiple"
            selected={[...selectedDateSet].map((d) => new Date(d + "T00:00:00"))}
            onSelect={handleSingleSelect}
            numberOfMonths={2}
            weekStartsOn={1}
            disabled={{ before: new Date() }}
            classNames={dayPickerClassNames}
          />
        )}
      </div>

      {/* Pattern Mode: Show Generated Groups */}
      {isPatternMode && dateGroups.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-subtext1">
                Generated voting options ({dateGroups.length - excludedGroups.size} of {dateGroups.length}):
              </p>
              <p className="text-xs text-overlay1">Click a period to exclude/include it.</p>
            </div>
            <button
              type="button"
              onClick={handleClearDates}
              className="text-sm text-overlay1 hover:text-red transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {dateGroups.map((group, index) => {
              const isExcluded = excludedGroups.has(index);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleToggleGroup(index)}
                  className={`rounded-lg p-3 text-left transition-all ${
                    isExcluded
                      ? "bg-surface0 opacity-50"
                      : index % 2 === 0
                        ? "bg-blue/20 hover:bg-blue/30"
                        : "bg-sapphire/20 hover:bg-sapphire/30"
                  }`}
                >
                  <p className={`text-sm font-medium ${isExcluded ? "text-overlay0 line-through" : "text-text"}`}>
                    {group.label}
                  </p>
                  <p className="text-xs text-overlay1">{group.range}</p>
                </button>
              );
            })}
          </div>

          {remainingDays > 0 && (
            <p className="text-xs text-yellow">
              Note: {remainingDays} day{remainingDays > 1 ? "s" : ""} at the end
              of your range don&apos;t form a complete period and won&apos;t be included.
            </p>
          )}

          {/* Hidden inputs for form submission - grouped dates as JSON (excluding banned groups) */}
          <input
            type="hidden"
            name="dates"
            value={JSON.stringify(
              dateGroups
                .filter((_, i) => !excludedGroups.has(i))
                .map((g) => g.dates)
            )}
          />
          <input type="hidden" name="pattern" value={JSON.stringify(pattern)} />
        </div>
      )}

      {/* Flexible Mode: Show Selected Dates */}
      {!isPatternMode && selectedDateSet.size > 0 && (
        <div className="rounded-lg border border-surface1 bg-surface0/50 p-4">
          {/* Hidden inputs for form submission - flat dates */}
          {[...selectedDateSet].map((date) => (
            <input key={date} type="hidden" name="dates" value={date} />
          ))}
          <input type="hidden" name="pattern" value={JSON.stringify(pattern)} />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">
                {formatRangeDisplay()}
              </p>
              <p className="text-xs text-overlay1 mt-1">
                {getTotalDaysSelected()} days selected
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearDates}
              className="text-sm text-overlay1 hover:text-red transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Empty State Hint */}
      {(isPatternMode ? dateGroups.length === 0 : selectedDateSet.size === 0) && (
        <p className="text-sm text-overlay1">
          {isPatternMode
            ? "Select a date range on the calendar. Each complete period within your range becomes a voting option."
            : mode === "range"
              ? "Click a start date, then an end date to select a range."
              : "Click dates to select them individually."}
        </p>
      )}
    </div>
  );
}
