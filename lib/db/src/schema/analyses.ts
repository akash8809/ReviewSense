import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productName: text("product_name").notNull(),
  productBrand: text("product_brand"),
  productUrl: text("product_url"),
  productImageUrl: text("product_image_url"),
  productCategory: text("product_category"),
  productPrice: text("product_price"),
  status: text("status").notNull().default("pending"),
  reviewCount: integer("review_count").notNull().default(0),
  positivePct: real("positive_pct").notNull().default(0),
  negativePct: real("negative_pct").notNull().default(0),
  neutralPct: real("neutral_pct").notNull().default(0),
  avgRating: real("avg_rating"),
  sentimentScore: real("sentiment_score"),
  aiConfidence: real("ai_confidence"),
  overallSummary: text("overall_summary"),
  customerOpinion: text("customer_opinion"),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  recommendation: text("recommendation"),
  businessInsights: text("business_insights"),
  positiveKeywords: text("positive_keywords"),
  negativeKeywords: text("negative_keywords"),
  topPhrases: text("top_phrases"),
  predNextMonthPositivePct: real("pred_next_month_positive_pct"),
  predNextMonthNegativePct: real("pred_next_month_negative_pct"),
  predExpectedRating: real("pred_expected_rating"),
  predSatisfactionScore: real("pred_satisfaction_score"),
  predRiskScore: real("pred_risk_score"),
  predBuyRecommendation: text("pred_buy_recommendation"),
  ratingDistribution: text("rating_distribution"),
  sentimentTimeline: text("sentiment_timeline"),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({ id: true, createdAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
