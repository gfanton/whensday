import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const doodles = sqliteTable("doodles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dates: text("dates", { mode: "json" }).notNull().$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const votes = sqliteTable("votes", {
  id: text("id").primaryKey(),
  doodleId: text("doodle_id")
    .notNull()
    .references(() => doodles.id, { onDelete: "cascade" }),
  participantName: text("participant_name").notNull(),
  responses: text("responses", { mode: "json" })
    .notNull()
    .$type<Record<string, "yes" | "maybe" | "no">>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
