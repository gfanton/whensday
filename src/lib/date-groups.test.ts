import { describe, it, expect } from "vitest";
import {
  generateDateGroups,
  getPatternDays,
  getGroupLabel,
  formatGroupRange,
  countPossibleGroups,
  getRemainingDays,
  calculateWeekdaySpan,
  getWeekdayRangeLabel,
  WEEKDAY_NAMES,
  type DateRange,
} from "./date-groups";
import type { DatePattern } from "@/db/types";

// ---- Helper Functions

function createRange(start: string, end: string): DateRange {
  return {
    start: new Date(start + "T00:00:00"),
    end: new Date(end + "T00:00:00"),
  };
}

// ---- calculateWeekdaySpan Tests

describe("calculateWeekdaySpan", () => {
  it("calculates same-day span as 1", () => {
    expect(calculateWeekdaySpan(1, 1)).toBe(1); // Mon-Mon
    expect(calculateWeekdaySpan(5, 5)).toBe(1); // Fri-Fri
  });

  it("calculates normal range without wrap-around", () => {
    expect(calculateWeekdaySpan(1, 5)).toBe(5); // Mon-Fri
    expect(calculateWeekdaySpan(6, 0)).toBe(2); // Sat-Sun
    expect(calculateWeekdaySpan(0, 6)).toBe(7); // Sun-Sat (full week)
  });

  it("calculates wrap-around range", () => {
    expect(calculateWeekdaySpan(5, 0)).toBe(3); // Fri-Sun (Fri, Sat, Sun)
    expect(calculateWeekdaySpan(5, 1)).toBe(4); // Fri-Mon (Fri, Sat, Sun, Mon)
    expect(calculateWeekdaySpan(6, 1)).toBe(3); // Sat-Mon (Sat, Sun, Mon)
    expect(calculateWeekdaySpan(4, 2)).toBe(6); // Thu-Tue
  });
});

// ---- getWeekdayRangeLabel Tests

describe("getWeekdayRangeLabel", () => {
  it("returns correct label for weekday range", () => {
    expect(getWeekdayRangeLabel(5, 0, 1)).toBe("Fri-Sun 1");
    expect(getWeekdayRangeLabel(5, 1, 2)).toBe("Fri-Mon 2");
    expect(getWeekdayRangeLabel(1, 0, 1)).toBe("Mon-Sun 1");
    expect(getWeekdayRangeLabel(1, 5, 3)).toBe("Mon-Fri 3");
  });
});

// ---- WEEKDAY_NAMES Tests

describe("WEEKDAY_NAMES", () => {
  it("has correct order", () => {
    expect(WEEKDAY_NAMES).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });
});

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

  describe("weekday-range pattern", () => {
    describe("Fri-Sun (3-day long weekend)", () => {
      it("finds all Fri-Sun periods in range", () => {
        // Jan 31, 2025 is a Friday
        const pattern: DatePattern = { type: "weekday-range", startDay: 5, endDay: 0 };
        const range = createRange("2025-01-29", "2025-02-28");
        const groups = generateDateGroups(pattern, range);

        // Should find Fri-Sun: Jan 31-Feb 2, Feb 7-9, Feb 14-16, Feb 21-23, Feb 28 incomplete
        expect(groups).toHaveLength(4);
        expect(groups[0]?.dates).toEqual(["2025-01-31", "2025-02-01", "2025-02-02"]);
        expect(groups[0]?.label).toBe("Fri-Sun 1");
        expect(groups[1]?.dates).toEqual(["2025-02-07", "2025-02-08", "2025-02-09"]);
        expect(groups[2]?.dates).toEqual(["2025-02-14", "2025-02-15", "2025-02-16"]);
        expect(groups[3]?.dates).toEqual(["2025-02-21", "2025-02-22", "2025-02-23"]);
      });

      it("skips to next Friday when range starts mid-week", () => {
        // Jan 29, 2025 is a Wednesday
        const pattern: DatePattern = { type: "weekday-range", startDay: 5, endDay: 0 };
        const range = createRange("2025-01-29", "2025-02-02");
        const groups = generateDateGroups(pattern, range);

        expect(groups).toHaveLength(1);
        expect(groups[0]?.dates).toEqual(["2025-01-31", "2025-02-01", "2025-02-02"]);
      });
    });

    describe("Fri-Mon (4-day long weekend)", () => {
      it("finds all Fri-Mon periods in range", () => {
        const pattern: DatePattern = { type: "weekday-range", startDay: 5, endDay: 1 };
        const range = createRange("2025-01-29", "2025-02-28");
        const groups = generateDateGroups(pattern, range);

        // Should find Fri-Mon: Jan 31-Feb 3, Feb 7-10, Feb 14-17, Feb 21-24
        expect(groups).toHaveLength(4);
        expect(groups[0]?.dates).toEqual(["2025-01-31", "2025-02-01", "2025-02-02", "2025-02-03"]);
        expect(groups[0]?.label).toBe("Fri-Mon 1");
        expect(groups[1]?.dates).toEqual(["2025-02-07", "2025-02-08", "2025-02-09", "2025-02-10"]);
      });

      it("excludes incomplete Fri-Mon at end of range", () => {
        // Range ends on Sunday, so last Fri-Mon is incomplete
        const pattern: DatePattern = { type: "weekday-range", startDay: 5, endDay: 1 };
        const range = createRange("2025-01-31", "2025-02-09");
        const groups = generateDateGroups(pattern, range);

        // Only Jan 31-Feb 3 fits completely
        expect(groups).toHaveLength(1);
        expect(groups[0]?.dates).toEqual(["2025-01-31", "2025-02-01", "2025-02-02", "2025-02-03"]);
      });
    });

    describe("Mon-Sun (full week)", () => {
      it("finds all Mon-Sun periods in range", () => {
        // Jan 27, 2025 is a Monday
        const pattern: DatePattern = { type: "weekday-range", startDay: 1, endDay: 0 };
        const range = createRange("2025-01-27", "2025-02-16");
        const groups = generateDateGroups(pattern, range);

        // Should find Mon-Sun: Jan 27-Feb 2, Feb 3-9, Feb 10-16
        expect(groups).toHaveLength(3);
        expect(groups[0]?.dates).toHaveLength(7);
        expect(groups[0]?.dates[0]).toBe("2025-01-27");
        expect(groups[0]?.dates[6]).toBe("2025-02-02");
        expect(groups[0]?.label).toBe("Mon-Sun 1");
      });

      it("skips to next Monday when range starts mid-week", () => {
        // Jan 29, 2025 is a Wednesday, next Monday is Feb 3
        const pattern: DatePattern = { type: "weekday-range", startDay: 1, endDay: 0 };
        const range = createRange("2025-01-29", "2025-02-09");
        const groups = generateDateGroups(pattern, range);

        expect(groups).toHaveLength(1);
        expect(groups[0]?.dates[0]).toBe("2025-02-03");
        expect(groups[0]?.dates[6]).toBe("2025-02-09");
      });
    });

    describe("Mon-Fri (work week)", () => {
      it("finds all Mon-Fri periods in range", () => {
        const pattern: DatePattern = { type: "weekday-range", startDay: 1, endDay: 5 };
        const range = createRange("2025-01-27", "2025-02-14");
        const groups = generateDateGroups(pattern, range);

        // Should find Mon-Fri: Jan 27-31, Feb 3-7, Feb 10-14
        expect(groups).toHaveLength(3);
        expect(groups[0]?.dates).toHaveLength(5);
        expect(groups[0]?.dates).toEqual(["2025-01-27", "2025-01-28", "2025-01-29", "2025-01-30", "2025-01-31"]);
        expect(groups[0]?.label).toBe("Mon-Fri 1");
      });
    });

    describe("edge cases", () => {
      it("handles range too short for any complete group", () => {
        const pattern: DatePattern = { type: "weekday-range", startDay: 5, endDay: 1 };
        // Only 3 days, Fri-Mon needs 4
        const range = createRange("2025-01-31", "2025-02-02");
        const groups = generateDateGroups(pattern, range);

        expect(groups).toHaveLength(0);
      });

      it("handles range starting exactly on start day", () => {
        // Jan 31 is a Friday
        const pattern: DatePattern = { type: "weekday-range", startDay: 5, endDay: 0 };
        const range = createRange("2025-01-31", "2025-02-02");
        const groups = generateDateGroups(pattern, range);

        expect(groups).toHaveLength(1);
        expect(groups[0]?.dates).toEqual(["2025-01-31", "2025-02-01", "2025-02-02"]);
      });

      it("handles Sat-Tue wrap-around", () => {
        const pattern: DatePattern = { type: "weekday-range", startDay: 6, endDay: 2 };
        // Feb 1, 2025 is a Saturday
        const range = createRange("2025-02-01", "2025-02-18");
        const groups = generateDateGroups(pattern, range);

        // Sat-Tue: Feb 1-4, Feb 8-11, Feb 15-18
        expect(groups).toHaveLength(3);
        expect(groups[0]?.dates).toEqual(["2025-02-01", "2025-02-02", "2025-02-03", "2025-02-04"]);
        expect(groups[0]?.label).toBe("Sat-Tue 1");
      });
    });
  });
});

// ---- getPatternDays Tests

describe("getPatternDays", () => {
  it("returns 2 for weekend", () => {
    expect(getPatternDays({ type: "weekend" })).toBe(2);
  });

  it("returns calculated span for weekday-range", () => {
    expect(getPatternDays({ type: "weekday-range", startDay: 5, endDay: 0 })).toBe(3); // Fri-Sun
    expect(getPatternDays({ type: "weekday-range", startDay: 5, endDay: 1 })).toBe(4); // Fri-Mon
    expect(getPatternDays({ type: "weekday-range", startDay: 1, endDay: 0 })).toBe(7); // Mon-Sun
    expect(getPatternDays({ type: "weekday-range", startDay: 1, endDay: 5 })).toBe(5); // Mon-Fri
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

  it("returns weekday range label for weekday-range pattern", () => {
    expect(getGroupLabel({ type: "weekday-range", startDay: 5, endDay: 0 }, 1)).toBe("Fri-Sun 1");
    expect(getGroupLabel({ type: "weekday-range", startDay: 5, endDay: 1 }, 2)).toBe("Fri-Mon 2");
    expect(getGroupLabel({ type: "weekday-range", startDay: 1, endDay: 0 }, 3)).toBe("Mon-Sun 3");
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

  it("counts weekday-range pattern (Fri-Sun)", () => {
    const pattern: DatePattern = { type: "weekday-range", startDay: 5, endDay: 0 };
    // Jan 29 (Wed) to Feb 28 - should find 4 complete Fri-Sun
    const range = createRange("2025-01-29", "2025-02-28");
    expect(countPossibleGroups(pattern, range)).toBe(4);
  });

  it("counts weekday-range pattern (Fri-Mon)", () => {
    const pattern: DatePattern = { type: "weekday-range", startDay: 5, endDay: 1 };
    // Jan 29 (Wed) to Feb 28 - should find 4 complete Fri-Mon
    const range = createRange("2025-01-29", "2025-02-28");
    expect(countPossibleGroups(pattern, range)).toBe(4);
  });

  it("counts weekday-range pattern (Mon-Sun full week)", () => {
    const pattern: DatePattern = { type: "weekday-range", startDay: 1, endDay: 0 };
    // Jan 27 (Mon) to Feb 16 (Sun) - should find 3 complete weeks
    const range = createRange("2025-01-27", "2025-02-16");
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

  it("returns 0 for weekday-range pattern", () => {
    const pattern: DatePattern = { type: "weekday-range", startDay: 5, endDay: 0 };
    const range = createRange("2025-01-01", "2025-01-15");
    expect(getRemainingDays(pattern, range)).toBe(0);
  });

  it("returns 0 for flexible pattern", () => {
    const pattern: DatePattern = { type: "flexible" };
    const range = createRange("2025-01-01", "2025-01-10");
    expect(getRemainingDays(pattern, range)).toBe(0);
  });
});
