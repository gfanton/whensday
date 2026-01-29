import {
  format,
  eachDayOfInterval,
  addDays,
  isSaturday,
  nextSaturday,
  startOfDay,
  getDay,
} from "date-fns";
import type { DatePattern } from "@/db/types";

export type DateRange = { start: Date; end: Date };

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

export type DateGroup = {
  dates: string[];
  label: string;
  range: string; // e.g., "Jan 28 - Feb 3"
};

// ---- Constants

export const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// ---- Weekday Range Helpers

/**
 * Calculate the number of days in a weekday range, handling wrap-around.
 * For example: Fri(5) to Mon(1) = 4 days (Fri, Sat, Sun, Mon)
 */
export function calculateWeekdaySpan(startDay: number, endDay: number): number {
  if (endDay >= startDay) {
    return endDay - startDay + 1;
  }
  // Wrap: Fri(5) to Mon(1) = (7 - 5) + 1 + 1 = 4 days
  return 7 - startDay + endDay + 1;
}

/**
 * Get label for a weekday range group.
 * e.g., "Fri-Mon 1" or "Mon-Sun 2"
 */
export function getWeekdayRangeLabel(startDay: number, endDay: number, index: number): string {
  const startName = WEEKDAY_NAMES[startDay];
  const endName = WEEKDAY_NAMES[endDay];
  return `${startName}-${endName} ${index}`;
}

/**
 * Find the next occurrence of a specific weekday on or after a given date.
 */
function nextWeekday(date: Date, weekday: number): Date {
  const currentDay = getDay(date);
  if (currentDay === weekday) {
    return date;
  }
  const daysUntil = (weekday - currentDay + 7) % 7;
  return addDays(date, daysUntil);
}

// ---- Generate Date Groups

/**
 * Generate date groups from a pattern and date range.
 * Each group becomes a separate voting option.
 */
export function generateDateGroups(
  pattern: DatePattern,
  range: DateRange
): DateGroup[] {
  switch (pattern.type) {
    case "flexible":
      return generateFlexibleGroups(range);
    case "weekend":
      return generateWeekendGroups(range);
    case "weekday-range":
      return generateWeekdayRangeGroups(range, pattern.startDay, pattern.endDay);
    default:
      return assertNever(pattern);
  }
}

/**
 * Generate flexible groups - each day is its own group.
 */
function generateFlexibleGroups(range: DateRange): DateGroup[] {
  const days = eachDayOfInterval({ start: range.start, end: range.end });
  return days.map((day) => ({
    dates: [format(day, "yyyy-MM-dd")],
    label: format(day, "EEE, MMM d"),
    range: format(day, "MMM d"),
  }));
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
 * Generate weekday range groups within a date range.
 * Finds all weekly occurrences of the specified weekday range.
 * For example: startDay=5 (Fri), endDay=1 (Mon) finds every Fri-Mon.
 */
function generateWeekdayRangeGroups(
  range: DateRange,
  startDay: number,
  endDay: number
): DateGroup[] {
  const groups: DateGroup[] = [];
  let groupIndex = 1;

  const span = calculateWeekdaySpan(startDay, endDay);

  // Find first occurrence of startDay on or after range start
  let current = startOfDay(nextWeekday(range.start, startDay));

  while (current <= range.end) {
    const groupEnd = addDays(current, span - 1);

    // Only include complete groups that fit in range
    if (groupEnd <= range.end) {
      const dates = eachDayOfInterval({ start: current, end: groupEnd }).map(
        (d) => format(d, "yyyy-MM-dd")
      );

      groups.push({
        dates,
        label: getWeekdayRangeLabel(startDay, endDay, groupIndex),
        range: formatGroupRange([current, groupEnd]),
      });
      groupIndex++;
    }

    // Move to next week
    current = addDays(current, 7);
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
    case "weekday-range":
      return calculateWeekdaySpan(pattern.startDay, pattern.endDay);
    case "flexible":
      return 1;
    default:
      return assertNever(pattern);
  }
}

/**
 * Get the label for a group based on pattern type.
 */
export function getGroupLabel(pattern: DatePattern, index: number): string {
  switch (pattern.type) {
    case "weekend":
      return `Weekend ${index}`;
    case "weekday-range":
      return getWeekdayRangeLabel(pattern.startDay, pattern.endDay, index);
    case "flexible":
      return `Day ${index}`;
    default:
      return assertNever(pattern);
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

  if (pattern.type === "weekday-range") {
    // Count weekday range occurrences
    const span = calculateWeekdaySpan(pattern.startDay, pattern.endDay);
    let count = 0;
    let current = startOfDay(nextWeekday(range.start, pattern.startDay));
    while (addDays(current, span - 1) <= range.end) {
      count++;
      current = addDays(current, 7);
    }
    return count;
  }

  if (pattern.type === "flexible") {
    const totalDays = Math.floor(
      (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    return totalDays;
  }

  return assertNever(pattern);
}

/**
 * Calculate remaining days that don't form a complete group.
 * For weekday-range patterns, this is always 0 since we find weekly occurrences.
 */
export function getRemainingDays(pattern: DatePattern, range: DateRange): number {
  if (pattern.type === "weekend" || pattern.type === "weekday-range") {
    // For weekend and weekday-range, remaining days don't apply the same way
    return 0;
  }

  if (pattern.type === "flexible") {
    // Flexible uses all days, so no remaining
    return 0;
  }

  return assertNever(pattern);
}
