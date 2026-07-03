import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").notNull(),
  text: text("text").notNull(),
  sentiment: text("sentiment").notNull().default("neutral"),
  sentimentScore: real("sentiment_score"),
  confidence: real("confidence"),
  rating: real("rating"),
  reviewDate: text("review_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
