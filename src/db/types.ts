// Types that can be imported in client components
// These are separated from index.ts to avoid importing server-only code

export type { DatePattern, DoodleDates } from "./schema";

// Helper to check if dates are grouped (pattern mode)
export function isGroupedDates(dates: string[] | string[][]): dates is string[][] {
  return dates.length > 0 && Array.isArray(dates[0]);
}
