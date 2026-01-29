import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { DatePattern, DoodleDates } from "./types";

export const doodles = sqliteTable("doodles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dates: text("dates", { mode: "json" }).notNull().$type<DoodleDates>(),
  pattern: text("pattern", { mode: "json" }).$type<DatePattern | null>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  // Poll settings
  requireAllDates: integer("require_all_dates", { mode: "boolean" }).default(false),
  allowMaybe: integer("allow_maybe", { mode: "boolean" }).default(true),
  hideParticipants: integer("hide_participants", { mode: "boolean" }).default(false),
  hideScores: integer("hide_scores", { mode: "boolean" }).default(false),
});

export const votes = sqliteTable("votes", {
  id: text("id").primaryKey(),
  doodleId: text("doodle_id")
    .notNull()
    .references(() => doodles.id, { onDelete: "cascade" }),
  participantName: text("participant_name").notNull(),
  responses: text("responses", { mode: "json" })
    .notNull()
    .$type<Record<string, "yes" | "maybe" | "no" | undefined>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
