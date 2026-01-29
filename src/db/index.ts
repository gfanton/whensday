import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { z } from "zod";
import * as schema from "./schema";

// ---- Database Connection

const sqlite = new Database("./data/daadle.db");
export const db = drizzle(sqlite, { schema });

// ---- Zod Schemas

// Date string format: YYYY-MM-DD
const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");

// Date group: array of date strings (e.g., ["2025-01-28", "2025-01-29", ...])
const DateGroupSchema = z.array(DateStringSchema).min(1);

// Dates can be flat (flexible mode) or grouped (pattern mode)
const DatesSchema = z.union([
  // Flat array for flexible mode
  z.array(DateStringSchema).min(1, "At least one date is required"),
  // Array of groups for pattern mode
  z.array(DateGroupSchema).min(1, "At least one date group is required"),
]);

// Pattern schema
const PatternSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("weekend") }),
  z.object({ type: z.literal("long-weekend"), days: z.union([z.literal(3), z.literal(4)]) }),
  z.object({ type: z.literal("week") }),
  z.object({ type: z.literal("two-weeks") }),
  z.object({ type: z.literal("custom"), days: z.number().min(1).max(31) }),
  z.object({ type: z.literal("flexible") }),
]);

export const CreateDoodleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  dates: DatesSchema,
  pattern: PatternSchema.optional().nullable(),
  // Poll settings
  requireAllDates: z.boolean().default(false),
  allowMaybe: z.boolean().default(true),
  hideParticipants: z.boolean().default(false),
  hideScores: z.boolean().default(false),
});

// Vote responses: key can be either date string (flexible) or group index (pattern)
export const CastVoteSchema = z.object({
  doodleId: z.string().uuid(),
  participantName: z.string().min(1, "Name is required").max(100),
  participantId: z.string().uuid().optional(), // For editing existing votes
  responses: z.record(
    z.string(), // Either date string "YYYY-MM-DD" or group index "0", "1", etc.
    z.enum(["yes", "maybe", "no"]).optional()
  ),
});

// ---- Types

export type Doodle = typeof schema.doodles.$inferSelect;
export type Vote = typeof schema.votes.$inferSelect;
export type CreateDoodleInput = z.infer<typeof CreateDoodleSchema>;
export type CastVoteInput = z.infer<typeof CastVoteSchema>;

// Re-export client-safe types and helpers
export { isGroupedDates } from "./types";
export type { DatePattern, DoodleDates } from "./types";
