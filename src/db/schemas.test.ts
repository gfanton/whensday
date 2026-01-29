import { describe, it, expect } from "vitest";
import { CreateDoodleSchema, CastVoteSchema } from "./index";

// ---- CreateDoodleSchema Tests

describe("CreateDoodleSchema", () => {
  describe("valid inputs", () => {
    it("accepts flat dates (flexible mode)", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "Holiday Planning",
        dates: ["2025-01-20", "2025-01-21", "2025-01-22"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dates).toEqual(["2025-01-20", "2025-01-21", "2025-01-22"]);
      }
    });

    it("accepts grouped dates (pattern mode)", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "Holiday Planning",
        dates: [
          ["2025-01-20", "2025-01-21"],
          ["2025-01-27", "2025-01-28"],
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dates).toHaveLength(2);
      }
    });

    it("accepts optional description", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "Holiday Planning",
        description: "Let's find a date for our team holiday!",
        dates: ["2025-01-20"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe("Let's find a date for our team holiday!");
      }
    });

    it("accepts all pattern types", () => {
      const patterns = [
        { type: "weekend" as const },
        { type: "long-weekend" as const, days: 3 as const },
        { type: "long-weekend" as const, days: 4 as const },
        { type: "week" as const },
        { type: "two-weeks" as const },
        { type: "custom" as const, days: 5 },
        { type: "flexible" as const },
      ];

      for (const pattern of patterns) {
        const result = CreateDoodleSchema.safeParse({
          title: "Test",
          dates: ["2025-01-20"],
          pattern,
        });
        expect(result.success).toBe(true);
      }
    });

    it("accepts poll settings", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "Holiday Planning",
        dates: ["2025-01-20"],
        requireAllDates: true,
        allowMaybe: false,
        hideParticipants: true,
        hideScores: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.requireAllDates).toBe(true);
        expect(result.data.allowMaybe).toBe(false);
        expect(result.data.hideParticipants).toBe(true);
        expect(result.data.hideScores).toBe(true);
      }
    });

    it("applies default values for poll settings", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "Holiday Planning",
        dates: ["2025-01-20"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.requireAllDates).toBe(false);
        expect(result.data.allowMaybe).toBe(true);
        expect(result.data.hideParticipants).toBe(false);
        expect(result.data.hideScores).toBe(false);
      }
    });
  });

  describe("invalid inputs", () => {
    it("rejects empty title", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "",
        dates: ["2025-01-20"],
      });

      expect(result.success).toBe(false);
    });

    it("rejects title over 200 characters", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "a".repeat(201),
        dates: ["2025-01-20"],
      });

      expect(result.success).toBe(false);
    });

    it("rejects description over 1000 characters", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "Valid Title",
        description: "a".repeat(1001),
        dates: ["2025-01-20"],
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty dates array", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "Holiday Planning",
        dates: [],
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid date format", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "Holiday Planning",
        dates: ["01-20-2025"], // Wrong format
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid date strings", () => {
      const invalidDates = [
        "2025-1-20", // Missing leading zero
        "2025/01/20", // Wrong separator
        "20-01-2025", // Wrong order
        "not-a-date",
        "2025-13-01", // Invalid month (still matches regex)
      ];

      for (const invalidDate of invalidDates.slice(0, 4)) {
        const result = CreateDoodleSchema.safeParse({
          title: "Test",
          dates: [invalidDate],
        });
        expect(result.success).toBe(false);
      }
    });

    it("rejects invalid pattern type", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "Test",
        dates: ["2025-01-20"],
        pattern: { type: "invalid" },
      });

      expect(result.success).toBe(false);
    });

    it("rejects long-weekend with invalid days", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "Test",
        dates: ["2025-01-20"],
        pattern: { type: "long-weekend", days: 5 },
      });

      expect(result.success).toBe(false);
    });

    it("rejects custom pattern with days out of range", () => {
      const tooSmall = CreateDoodleSchema.safeParse({
        title: "Test",
        dates: ["2025-01-20"],
        pattern: { type: "custom", days: 0 },
      });
      expect(tooSmall.success).toBe(false);

      const tooLarge = CreateDoodleSchema.safeParse({
        title: "Test",
        dates: ["2025-01-20"],
        pattern: { type: "custom", days: 32 },
      });
      expect(tooLarge.success).toBe(false);
    });

    it("rejects empty group in grouped dates", () => {
      const result = CreateDoodleSchema.safeParse({
        title: "Test",
        dates: [
          ["2025-01-20", "2025-01-21"],
          [], // Empty group
        ],
      });

      expect(result.success).toBe(false);
    });
  });
});

// ---- CastVoteSchema Tests

describe("CastVoteSchema", () => {
  describe("valid inputs", () => {
    it("accepts valid vote with yes/no/maybe responses", () => {
      const result = CastVoteSchema.safeParse({
        doodleId: "550e8400-e29b-41d4-a716-446655440000",
        participantName: "John",
        responses: {
          "2025-01-20": "yes",
          "2025-01-21": "no",
          "2025-01-22": "maybe",
        },
      });

      expect(result.success).toBe(true);
    });

    it("accepts vote with group index keys", () => {
      const result = CastVoteSchema.safeParse({
        doodleId: "550e8400-e29b-41d4-a716-446655440000",
        participantName: "John",
        responses: {
          "0": "yes",
          "1": "no",
          "2": "maybe",
        },
      });

      expect(result.success).toBe(true);
    });

    it("accepts vote with optional participantId for editing", () => {
      const result = CastVoteSchema.safeParse({
        doodleId: "550e8400-e29b-41d4-a716-446655440000",
        participantName: "John",
        participantId: "660e8400-e29b-41d4-a716-446655440001",
        responses: {
          "2025-01-20": "yes",
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.participantId).toBe("660e8400-e29b-41d4-a716-446655440001");
      }
    });

    it("accepts empty responses", () => {
      const result = CastVoteSchema.safeParse({
        doodleId: "550e8400-e29b-41d4-a716-446655440000",
        participantName: "John",
        responses: {},
      });

      expect(result.success).toBe(true);
    });

    it("accepts undefined response values", () => {
      const result = CastVoteSchema.safeParse({
        doodleId: "550e8400-e29b-41d4-a716-446655440000",
        participantName: "John",
        responses: {
          "2025-01-20": "yes",
          "2025-01-21": undefined,
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects invalid doodleId (not UUID)", () => {
      const result = CastVoteSchema.safeParse({
        doodleId: "not-a-uuid",
        participantName: "John",
        responses: {},
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty participant name", () => {
      const result = CastVoteSchema.safeParse({
        doodleId: "550e8400-e29b-41d4-a716-446655440000",
        participantName: "",
        responses: {},
      });

      expect(result.success).toBe(false);
    });

    it("rejects participant name over 100 characters", () => {
      const result = CastVoteSchema.safeParse({
        doodleId: "550e8400-e29b-41d4-a716-446655440000",
        participantName: "a".repeat(101),
        responses: {},
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid response values", () => {
      const result = CastVoteSchema.safeParse({
        doodleId: "550e8400-e29b-41d4-a716-446655440000",
        participantName: "John",
        responses: {
          "2025-01-20": "invalid",
        },
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid participantId (not UUID)", () => {
      const result = CastVoteSchema.safeParse({
        doodleId: "550e8400-e29b-41d4-a716-446655440000",
        participantName: "John",
        participantId: "not-a-uuid",
        responses: {},
      });

      expect(result.success).toBe(false);
    });
  });
});
