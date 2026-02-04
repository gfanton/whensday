import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { z } from "zod";
import * as schema from "./schema";
import { PatternSchema } from "./types";

// ---- Database Connection

const sqlite = new Database("./data/whensday.db");

// Auto-create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS doodles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    dates TEXT NOT NULL,
    pattern TEXT,
    created_at INTEGER NOT NULL,
    require_all_dates INTEGER DEFAULT 0,
    allow_maybe INTEGER DEFAULT 1,
    hide_participants INTEGER DEFAULT 0,
    hide_scores INTEGER DEFAULT 0,
    owner_key_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    doodle_id TEXT NOT NULL REFERENCES doodles(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    responses TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
  );
`);

// Safe migration: add columns if they don't exist
const PragmaColumnSchema = z.object({ name: z.string() });
const columnsRaw = sqlite.prepare("PRAGMA table_info(doodles)").all();
const columns: { name: string }[] = [];
for (const col of columnsRaw) {
  const result = PragmaColumnSchema.safeParse(col);
  if (result.success) {
    columns.push(result.data);
  }
}
const hasOwnerKeyHash = columns.some((col) => col.name === "owner_key_hash");
if (!hasOwnerKeyHash) {
  sqlite.exec("ALTER TABLE doodles ADD COLUMN owner_key_hash TEXT");
}

// Create accommodations table
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS accommodations (
    id TEXT PRIMARY KEY,
    doodle_id TEXT NOT NULL REFERENCES doodles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    image_url TEXT,
    site_name TEXT,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    submitter_name TEXT NOT NULL,
    comment TEXT,
    created_at INTEGER NOT NULL
  );
`);

// Migration: add comment column to accommodations if it doesn't exist
const accColumnsRaw = sqlite.prepare("PRAGMA table_info(accommodations)").all();
const accColumns: { name: string }[] = [];
for (const col of accColumnsRaw) {
  const result = PragmaColumnSchema.safeParse(col);
  if (result.success) {
    accColumns.push(result.data);
  }
}
const hasComment = accColumns.some((col) => col.name === "comment");
if (!hasComment) {
  sqlite.exec("ALTER TABLE accommodations ADD COLUMN comment TEXT");
}

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
  // Owner key hash for deletion authorization (64 char hex SHA-256)
  ownerKeyHash: z.string().length(64).optional(),
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

// Delete doodle validation
export const DeleteDoodleSchema = z.object({
  doodleId: z.string().uuid("Invalid poll ID"),
  ownerKey: z.string().uuid("Invalid owner key"),
});

// Accommodation validation
export const SubmitAccommodationSchema = z.object({
  doodleId: z.string().uuid(),
  url: z
    .string()
    .url("Invalid URL format")
    .max(2000, "URL is too long")
    .refine((url) => url.startsWith("https://"), {
      message: "URL must use HTTPS",
    }),
  submitterName: z.string().min(1, "Name is required").max(100),
  comment: z.string().max(500).optional(),
  // Metadata provided by client after scraping
  title: z.string().max(500).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  siteName: z.string().max(200).nullable().optional(),
});

export const VoteAccommodationSchema = z.object({
  accommodationId: z.string().uuid(),
  voteType: z.enum(["up", "down"]),
});

export const DeleteAccommodationSchema = z.object({
  accommodationId: z.string().uuid(),
  ownerKey: z.string().uuid("Invalid owner key"),
});

// ---- Types

export type Doodle = typeof schema.doodles.$inferSelect;
export type Vote = typeof schema.votes.$inferSelect;
export type Accommodation = typeof schema.accommodations.$inferSelect;
// Serializable accommodation data (without Date objects for client components)
export type AccommodationData = Omit<Accommodation, "createdAt">;
export type CreateDoodleInput = z.infer<typeof CreateDoodleSchema>;
export type CastVoteInput = z.infer<typeof CastVoteSchema>;
export type DeleteDoodleInput = z.infer<typeof DeleteDoodleSchema>;
export type SubmitAccommodationInput = z.infer<typeof SubmitAccommodationSchema>;
export type VoteAccommodationInput = z.infer<typeof VoteAccommodationSchema>;
export type DeleteAccommodationInput = z.infer<typeof DeleteAccommodationSchema>;

// Re-export client-safe types and helpers
export { isGroupedDates } from "./types";
export type { DatePattern, DoodleDates } from "./types";
