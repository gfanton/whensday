import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { z } from "zod";
import * as schema from "./schema";

// ---- Database Connection

const sqlite = new Database("./data/daadle.db");
export const db = drizzle(sqlite, { schema });

// ---- Zod Schemas

export const CreateDoodleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  dates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"))
    .min(1, "At least one date is required")
    .max(31, "Too many dates"),
});

export const CastVoteSchema = z.object({
  doodleId: z.string().uuid(),
  participantName: z.string().min(1, "Name is required").max(100),
  responses: z.record(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.enum(["yes", "maybe", "no"])
  ),
});

// ---- Types

export type Doodle = typeof schema.doodles.$inferSelect;
export type Vote = typeof schema.votes.$inferSelect;
export type CreateDoodleInput = z.infer<typeof CreateDoodleSchema>;
export type CastVoteInput = z.infer<typeof CastVoteSchema>;
