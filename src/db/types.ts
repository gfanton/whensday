// Types that can be imported in client components
// These are separated from index.ts to avoid importing server-only code

import { z } from "zod";

// ---- Zod Schemas (Single Source of Truth)

export const PatternSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("weekend") }), // Preset Sat-Sun
  z.object({
    type: z.literal("weekday-range"),
    startDay: z.number().min(0).max(6), // 0=Sun, 6=Sat
    endDay: z.number().min(0).max(6),
  }),
  z.object({ type: z.literal("flexible") }), // Each day is an option
]);

// ---- Derived Types

export type DatePattern = z.infer<typeof PatternSchema>;

// Dates can be:
// - string[] (flat) for flexible mode - each date is a voting option
// - string[][] (grouped) for pattern mode - each group is a voting option
export type DoodleDates = string[] | string[][];

// ---- Helpers

export function isGroupedDates(dates: string[] | string[][]): dates is string[][] {
  return dates.length > 0 && Array.isArray(dates[0]);
}
