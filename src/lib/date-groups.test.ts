import { describe, it, expect } from "vitest";
import {
  generateDateGroups,
  getPatternDays,
  getGroupLabel,
  formatGroupRange,
  countPossibleGroups,
  getRemainingDays,
  type DateRange,
} from "./date-groups";
import type { DatePattern } from "@/db/schema";

// ---- Helper Functions

function createRange(start: string, end: string): DateRange {
  return {
    start: new Date(start + "T00:00:00"),
    end: new Date(end + "T00:00:00"),
  };
}

// ---- generateDateGroups Tests

describe("generateDateGroups", () => {
  describe("flexible pattern", () => {
    it("returns one group per day", () => {
      const pattern: DatePattern = { type: "flexible" };
      const range = createRange("2025-01-20", "2025-01-22");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(3);
      expect(groups[0]?.dates).toEqual(["2025-01-20"]);
      expect(groups[1]?.dates).toEqual(["2025-01-21"]);
      expect(groups[2]?.dates).toEqual(["2025-01-22"]);
    });

    it("handles single day range", () => {
      const pattern: DatePattern = { type: "flexible" };
      const range = createRange("2025-01-20", "2025-01-20");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(1);
      expect(groups[0]?.dates).toEqual(["2025-01-20"]);
    });
  });

  describe("weekend pattern", () => {
    it("returns Saturday-Sunday pairs", () => {
      const pattern: DatePattern = { type: "weekend" };
      // Jan 18 is a Saturday, Jan 26 is a Sunday
      const range = createRange("2025-01-18", "2025-01-26");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(2);
      expect(groups[0]?.dates).toEqual(["2025-01-18", "2025-01-19"]);
      expect(groups[1]?.dates).toEqual(["2025-01-25", "2025-01-26"]);
      expect(groups[0]?.label).toBe("Weekend 1");
      expect(groups[1]?.label).toBe("Weekend 2");
    });

    it("skips to next Saturday when range starts mid-week", () => {
      const pattern: DatePattern = { type: "weekend" };
      // Jan 20 is a Monday, next Saturday is Jan 25
      const range = createRange("2025-01-20", "2025-01-26");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(1);
      expect(groups[0]?.dates).toEqual(["2025-01-25", "2025-01-26"]);
    });

    it("skips weekend when range starts on Sunday", () => {
      const pattern: DatePattern = { type: "weekend" };
      // Jan 19 is a Sunday, next Saturday is Jan 25
      const range = createRange("2025-01-19", "2025-01-26");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(1);
      expect(groups[0]?.dates).toEqual(["2025-01-25", "2025-01-26"]);
    });

    it("excludes incomplete weekend (Saturday only)", () => {
      const pattern: DatePattern = { type: "weekend" };
      // Jan 25 is a Saturday - range ends before Sunday
      const range = createRange("2025-01-20", "2025-01-25");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(0);
    });
  });

  describe("week pattern", () => {
    it("returns 7-day chunks", () => {
      const pattern: DatePattern = { type: "week" };
      const range = createRange("2025-01-01", "2025-01-14");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(2);
      expect(groups[0]?.dates).toHaveLength(7);
      expect(groups[0]?.dates[0]).toBe("2025-01-01");
      expect(groups[0]?.dates[6]).toBe("2025-01-07");
      expect(groups[1]?.dates[0]).toBe("2025-01-08");
      expect(groups[1]?.dates[6]).toBe("2025-01-14");
    });

    it("excludes incomplete week at end", () => {
      const pattern: DatePattern = { type: "week" };
      const range = createRange("2025-01-01", "2025-01-10");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(1);
      expect(groups[0]?.dates).toHaveLength(7);
    });

    it("handles single day range (no complete weeks)", () => {
      const pattern: DatePattern = { type: "week" };
      const range = createRange("2025-01-01", "2025-01-01");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(0);
    });
  });

  describe("two-weeks pattern", () => {
    it("returns 14-day chunks", () => {
      const pattern: DatePattern = { type: "two-weeks" };
      const range = createRange("2025-01-01", "2025-01-28");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(2);
      expect(groups[0]?.dates).toHaveLength(14);
      expect(groups[0]?.label).toBe("Fortnight 1");
      expect(groups[1]?.label).toBe("Fortnight 2");
    });

    it("handles single day range (no complete fortnights)", () => {
      const pattern: DatePattern = { type: "two-weeks" };
      const range = createRange("2025-01-01", "2025-01-01");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(0);
    });
  });

  describe("long-weekend pattern", () => {
    it("returns 3-day chunks", () => {
      const pattern: DatePattern = { type: "long-weekend", days: 3 };
      const range = createRange("2025-01-01", "2025-01-09");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(3);
      expect(groups[0]?.dates).toHaveLength(3);
      expect(groups[0]?.label).toBe("Long Weekend 1");
    });

    it("returns 4-day chunks when configured", () => {
      const pattern: DatePattern = { type: "long-weekend", days: 4 };
      const range = createRange("2025-01-01", "2025-01-08");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(2);
      expect(groups[0]?.dates).toHaveLength(4);
    });

    it("handles single day range (no complete long weekends)", () => {
      const pattern: DatePattern = { type: "long-weekend", days: 3 };
      const range = createRange("2025-01-01", "2025-01-01");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(0);
    });
  });

  describe("custom pattern", () => {
    it("returns N-day chunks based on custom days", () => {
      const pattern: DatePattern = { type: "custom", days: 5 };
      const range = createRange("2025-01-01", "2025-01-15");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(3);
      expect(groups[0]?.dates).toHaveLength(5);
      expect(groups[0]?.label).toBe("Period 1");
    });

    it("handles single day range (no complete periods)", () => {
      const pattern: DatePattern = { type: "custom", days: 5 };
      const range = createRange("2025-01-01", "2025-01-01");
      const groups = generateDateGroups(pattern, range);

      expect(groups).toHaveLength(0);
    });
  });
});

// ---- getPatternDays Tests

describe("getPatternDays", () => {
  it("returns 2 for weekend", () => {
    expect(getPatternDays({ type: "weekend" })).toBe(2);
  });

  it("returns days value for long-weekend", () => {
    expect(getPatternDays({ type: "long-weekend", days: 3 })).toBe(3);
    expect(getPatternDays({ type: "long-weekend", days: 4 })).toBe(4);
  });

  it("returns 7 for week", () => {
    expect(getPatternDays({ type: "week" })).toBe(7);
  });

  it("returns 14 for two-weeks", () => {
    expect(getPatternDays({ type: "two-weeks" })).toBe(14);
  });

  it("returns days value for custom", () => {
    expect(getPatternDays({ type: "custom", days: 5 })).toBe(5);
    expect(getPatternDays({ type: "custom", days: 10 })).toBe(10);
  });

  it("returns 1 for flexible", () => {
    expect(getPatternDays({ type: "flexible" })).toBe(1);
  });
});

// ---- getGroupLabel Tests

describe("getGroupLabel", () => {
  it("returns 'Weekend N' for weekend pattern", () => {
    expect(getGroupLabel({ type: "weekend" }, 1)).toBe("Weekend 1");
    expect(getGroupLabel({ type: "weekend" }, 5)).toBe("Weekend 5");
  });

  it("returns 'Long Weekend N' for long-weekend pattern", () => {
    expect(getGroupLabel({ type: "long-weekend", days: 3 }, 1)).toBe("Long Weekend 1");
    expect(getGroupLabel({ type: "long-weekend", days: 4 }, 3)).toBe("Long Weekend 3");
  });

  it("returns 'Week N' for week pattern", () => {
    expect(getGroupLabel({ type: "week" }, 1)).toBe("Week 1");
    expect(getGroupLabel({ type: "week" }, 2)).toBe("Week 2");
  });

  it("returns 'Fortnight N' for two-weeks pattern", () => {
    expect(getGroupLabel({ type: "two-weeks" }, 1)).toBe("Fortnight 1");
    expect(getGroupLabel({ type: "two-weeks" }, 2)).toBe("Fortnight 2");
  });

  it("returns 'Period N' for custom pattern", () => {
    expect(getGroupLabel({ type: "custom", days: 5 }, 1)).toBe("Period 1");
    expect(getGroupLabel({ type: "custom", days: 10 }, 4)).toBe("Period 4");
  });

  it("returns 'Day N' for flexible pattern", () => {
    expect(getGroupLabel({ type: "flexible" }, 1)).toBe("Day 1");
    expect(getGroupLabel({ type: "flexible" }, 10)).toBe("Day 10");
  });
});

// ---- formatGroupRange Tests

describe("formatGroupRange", () => {
  it("returns empty string for empty array", () => {
    expect(formatGroupRange([])).toBe("");
  });

  it("returns single date for single-day range", () => {
    expect(formatGroupRange([new Date("2025-01-20")])).toBe("Jan 20");
    expect(formatGroupRange(["2025-01-20"])).toBe("Jan 20");
  });

  it("formats same-month range with shared month name", () => {
    const dates = [new Date("2025-01-20"), new Date("2025-01-25")];
    expect(formatGroupRange(dates)).toBe("Jan 20 - 25");
  });

  it("formats cross-month range with both month names", () => {
    const dates = [new Date("2025-01-28"), new Date("2025-02-03")];
    expect(formatGroupRange(dates)).toBe("Jan 28 - Feb 3");
  });

  it("formats cross-year range", () => {
    const dates = [new Date("2024-12-28"), new Date("2025-01-04")];
    expect(formatGroupRange(dates)).toBe("Dec 28 - Jan 4");
  });

  it("handles string date inputs", () => {
    expect(formatGroupRange(["2025-01-20", "2025-01-25"])).toBe("Jan 20 - 25");
    expect(formatGroupRange(["2025-01-28", "2025-02-03"])).toBe("Jan 28 - Feb 3");
  });
});

// ---- countPossibleGroups Tests

describe("countPossibleGroups", () => {
  it("counts flexible pattern (one per day)", () => {
    const pattern: DatePattern = { type: "flexible" };
    const range = createRange("2025-01-01", "2025-01-10");
    expect(countPossibleGroups(pattern, range)).toBe(10);
  });

  it("counts weekend pattern", () => {
    const pattern: DatePattern = { type: "weekend" };
    // Jan 18 is Saturday, Jan 26 is Sunday - 2 complete weekends
    const range = createRange("2025-01-18", "2025-01-26");
    expect(countPossibleGroups(pattern, range)).toBe(2);
  });

  it("counts weekend pattern when starting mid-week with no complete weekends", () => {
    const pattern: DatePattern = { type: "weekend" };
    // Monday to Friday - no complete weekends
    const range = createRange("2025-01-20", "2025-01-24");
    expect(countPossibleGroups(pattern, range)).toBe(0);
  });

  it("counts week pattern", () => {
    const pattern: DatePattern = { type: "week" };
    const range = createRange("2025-01-01", "2025-01-21");
    expect(countPossibleGroups(pattern, range)).toBe(3);
  });

  it("counts two-weeks pattern", () => {
    const pattern: DatePattern = { type: "two-weeks" };
    const range = createRange("2025-01-01", "2025-01-28");
    expect(countPossibleGroups(pattern, range)).toBe(2);
  });

  it("counts long-weekend pattern", () => {
    const pattern: DatePattern = { type: "long-weekend", days: 3 };
    const range = createRange("2025-01-01", "2025-01-10");
    expect(countPossibleGroups(pattern, range)).toBe(3);
  });

  it("counts custom pattern", () => {
    const pattern: DatePattern = { type: "custom", days: 5 };
    const range = createRange("2025-01-01", "2025-01-15");
    expect(countPossibleGroups(pattern, range)).toBe(3);
  });
});

// ---- getRemainingDays Tests

describe("getRemainingDays", () => {
  it("returns 0 for weekend pattern", () => {
    const pattern: DatePattern = { type: "weekend" };
    const range = createRange("2025-01-01", "2025-01-15");
    expect(getRemainingDays(pattern, range)).toBe(0);
  });

  it("calculates remaining days for flexible pattern", () => {
    const pattern: DatePattern = { type: "flexible" };
    const range = createRange("2025-01-01", "2025-01-10");
    // 10 days total, 1 day per group = 0 remaining
    expect(getRemainingDays(pattern, range)).toBe(0);
  });

  it("calculates remaining days for week pattern", () => {
    const pattern: DatePattern = { type: "week" };
    const range = createRange("2025-01-01", "2025-01-10");
    // 10 days total, 7 per week = 3 remaining
    expect(getRemainingDays(pattern, range)).toBe(3);
  });

  it("calculates remaining days for two-weeks pattern", () => {
    const pattern: DatePattern = { type: "two-weeks" };
    const range = createRange("2025-01-01", "2025-01-20");
    // 20 days total, 14 per fortnight = 6 remaining
    expect(getRemainingDays(pattern, range)).toBe(6);
  });

  it("calculates remaining days for long-weekend pattern", () => {
    const pattern: DatePattern = { type: "long-weekend", days: 3 };
    const range = createRange("2025-01-01", "2025-01-10");
    // 10 days total, 3 per long weekend = 1 remaining
    expect(getRemainingDays(pattern, range)).toBe(1);
  });

  it("calculates remaining days for custom pattern", () => {
    const pattern: DatePattern = { type: "custom", days: 4 };
    const range = createRange("2025-01-01", "2025-01-10");
    // 10 days total, 4 per period = 2 remaining
    expect(getRemainingDays(pattern, range)).toBe(2);
  });

  it("returns 0 when days divide evenly", () => {
    const pattern: DatePattern = { type: "custom", days: 5 };
    const range = createRange("2025-01-01", "2025-01-10");
    // 10 days total, 5 per period = 0 remaining
    expect(getRemainingDays(pattern, range)).toBe(0);
  });
});
