import {
  format,
  eachDayOfInterval,
  addDays,
  isSaturday,
  nextSaturday,
  startOfDay,
} from "date-fns";
import type { DatePattern } from "@/db/schema";

export type DateRange = { start: Date; end: Date };

export type DateGroup = {
  dates: string[];
  label: string;
  range: string; // e.g., "Jan 28 - Feb 3"
};

// ---- Generate Date Groups

/**
 * Generate date groups from a pattern and date range.
 * Each group becomes a separate voting option.
 */
export function generateDateGroups(
  pattern: DatePattern,
  range: DateRange
): DateGroup[] {
  if (pattern.type === "flexible") {
    // Flexible mode: each day is its own group
    const days = eachDayOfInterval({ start: range.start, end: range.end });
    return days.map((day) => ({
      dates: [format(day, "yyyy-MM-dd")],
      label: format(day, "EEE, MMM d"),
      range: format(day, "MMM d"),
    }));
  }

  if (pattern.type === "weekend") {
    return generateWeekendGroups(range);
  }

  // For week, two-weeks, long-weekend, custom: generate N-day chunks
  const chunkSize = getPatternDays(pattern);
  return generateChunkedGroups(range, chunkSize, pattern);
}

/**
 * Generate weekend groups (Saturday-Sunday pairs) within a range.
 */
function generateWeekendGroups(range: DateRange): DateGroup[] {
  const groups: DateGroup[] = [];
  let weekendIndex = 1;

  // Find first Saturday on or after range start
  let current = range.start;
  if (!isSaturday(current)) {
    current = nextSaturday(current);
  }

  while (current <= range.end) {
    const saturday = current;
    const sunday = addDays(saturday, 1);

    // Only include if Sunday is within range
    if (sunday <= range.end) {
      groups.push({
        dates: [format(saturday, "yyyy-MM-dd"), format(sunday, "yyyy-MM-dd")],
        label: `Weekend ${weekendIndex}`,
        range: formatGroupRange([saturday, sunday]),
      });
      weekendIndex++;
    }

    // Move to next Saturday
    current = addDays(current, 7);
  }

  return groups;
}

/**
 * Generate N-day chunks within a range.
 * Excludes partial chunks at the end.
 */
function generateChunkedGroups(
  range: DateRange,
  chunkSize: number,
  pattern: DatePattern
): DateGroup[] {
  const groups: DateGroup[] = [];
  let groupIndex = 1;
  let current = startOfDay(range.start);

  while (current <= range.end) {
    const chunkEnd = addDays(current, chunkSize - 1);

    // Only include complete chunks
    if (chunkEnd <= range.end) {
      const dates = eachDayOfInterval({ start: current, end: chunkEnd }).map(
        (d) => format(d, "yyyy-MM-dd")
      );

      groups.push({
        dates,
        label: getGroupLabel(pattern, groupIndex),
        range: formatGroupRange([current, chunkEnd]),
      });
      groupIndex++;
    }

    // Move to next chunk
    current = addDays(current, chunkSize);
  }

  return groups;
}

// ---- Helper Functions

/**
 * Get the number of days for a pattern.
 */
export function getPatternDays(pattern: DatePattern): number {
  switch (pattern.type) {
    case "weekend":
      return 2;
    case "long-weekend":
      return pattern.days;
    case "week":
      return 7;
    case "two-weeks":
      return 14;
    case "custom":
      return pattern.days;
    case "flexible":
      return 1;
  }
}

/**
 * Get the label for a group based on pattern type.
 */
export function getGroupLabel(pattern: DatePattern, index: number): string {
  switch (pattern.type) {
    case "weekend":
      return `Weekend ${index}`;
    case "long-weekend":
      return `Long Weekend ${index}`;
    case "week":
      return `Week ${index}`;
    case "two-weeks":
      return `Fortnight ${index}`;
    case "custom":
      return `Period ${index}`;
    case "flexible":
      return `Day ${index}`;
  }
}

/**
 * Format a date range for display.
 */
export function formatGroupRange(dates: Date[] | string[]): string {
  if (dates.length === 0) return "";

  const toDate = (d: Date | string): Date =>
    typeof d === "string" ? new Date(d + "T00:00:00") : d;

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  if (!firstDate || !lastDate) return "";

  const first = toDate(firstDate);
  const last = toDate(lastDate);

  if (dates.length === 1) {
    return format(first, "MMM d");
  }

  // Check if same month
  if (first.getMonth() === last.getMonth()) {
    return `${format(first, "MMM d")} - ${format(last, "d")}`;
  }

  return `${format(first, "MMM d")} - ${format(last, "MMM d")}`;
}

/**
 * Calculate how many complete groups would fit in a range.
 */
export function countPossibleGroups(pattern: DatePattern, range: DateRange): number {
  if (pattern.type === "weekend") {
    // Count weekends
    let count = 0;
    let current = range.start;
    if (!isSaturday(current)) {
      current = nextSaturday(current);
    }
    while (addDays(current, 1) <= range.end) {
      count++;
      current = addDays(current, 7);
    }
    return count;
  }

  const chunkSize = getPatternDays(pattern);
  const totalDays = Math.floor(
    (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  return Math.floor(totalDays / chunkSize);
}

/**
 * Calculate remaining days that don't form a complete group.
 */
export function getRemainingDays(pattern: DatePattern, range: DateRange): number {
  if (pattern.type === "weekend") {
    // For weekends, remaining days don't really apply the same way
    return 0;
  }

  const chunkSize = getPatternDays(pattern);
  const totalDays = Math.floor(
    (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  return totalDays % chunkSize;
}
