import { Router, type IRouter } from "express";
import { db, analysesTable, reviewsTable } from "@workspace/db";
import { eq, desc, sql, avg, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import type { Request } from "express";

const router: IRouter = Router();

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

// GET /dashboard/stats
router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);

  const [analysesCount, reviewsCount, avgData, recentCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(analysesTable)
      .where(eq(analysesTable.userId, user.userId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(reviewsTable)
      .innerJoin(analysesTable, eq(reviewsTable.analysisId, analysesTable.id))
      .where(eq(analysesTable.userId, user.userId)),
    db
      .select({
        avgPositivePct: avg(analysesTable.positivePct),
        avgNegativePct: avg(analysesTable.negativePct),
        avgNeutralPct: avg(analysesTable.neutralPct),
        avgRating: avg(analysesTable.avgRating),
      })
      .from(analysesTable)
      .where(eq(analysesTable.userId, user.userId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(analysesTable)
      .where(
        sql`${analysesTable.userId} = ${user.userId} AND ${analysesTable.createdAt} > NOW() - INTERVAL '7 days'`
      ),
  ]);

  const data = avgData[0];
  res.json({
    totalAnalyses: Number(analysesCount[0]?.count ?? 0),
    totalReviews: Number(reviewsCount[0]?.count ?? 0),
    avgPositivePct: Math.round(Number(data?.avgPositivePct ?? 0) * 10) / 10,
    avgNegativePct: Math.round(Number(data?.avgNegativePct ?? 0) * 10) / 10,
    avgNeutralPct: Math.round(Number(data?.avgNeutralPct ?? 0) * 10) / 10,
    avgRating: Math.round(Number(data?.avgRating ?? 0) * 10) / 10,
    recentCount: Number(recentCount[0]?.count ?? 0),
  });
});

// GET /dashboard/recent
router.get("/dashboard/recent", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);

  const analyses = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.userId, user.userId))
    .orderBy(desc(analysesTable.createdAt))
    .limit(5);

  res.json(
    analyses.map((a) => ({
      id: a.id,
      productName: a.productName,
      productBrand: a.productBrand ?? null,
      productImageUrl: a.productImageUrl ?? null,
      status: a.status,
      reviewCount: a.reviewCount,
      positivePct: a.positivePct,
      negativePct: a.negativePct,
      neutralPct: a.neutralPct,
      avgRating: a.avgRating ?? null,
      createdAt: a.createdAt.toISOString(),
    }))
  );
});

// GET /dashboard/trend — analyses per day + avg sentiment for last 30 days
router.get("/dashboard/trend", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const rows = await db
    .select({
      date: sql<string>`DATE(${analysesTable.createdAt})`,
      count: sql<number>`count(*)`,
      avgSentiment: avg(analysesTable.sentimentScore),
    })
    .from(analysesTable)
    .where(
      sql`${analysesTable.userId} = ${user.userId}
          AND ${analysesTable.createdAt} > NOW() - INTERVAL '30 days'
          AND ${analysesTable.status} = 'completed'`
    )
    .groupBy(sql`DATE(${analysesTable.createdAt})`)
    .orderBy(sql`DATE(${analysesTable.createdAt})`);

  res.json(rows.map((r) => ({
    date: r.date,
    count: Number(r.count),
    avgSentiment: Math.round(Number(r.avgSentiment ?? 0) * 10) / 10,
  })));
});

// GET /dashboard/usage — this month's usage vs free tier limit
router.get("/dashboard/usage", requireAuth, async (req, res): Promise<void> => {
  const user = getUser(req);
  const FREE_TIER_LIMIT = 50;
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(analysesTable)
    .where(
      sql`${analysesTable.userId} = ${user.userId}
          AND DATE_TRUNC('month', ${analysesTable.createdAt}) = DATE_TRUNC('month', NOW())`
    );
  const used = Number(result?.count ?? 0);
  res.json({ used, limit: FREE_TIER_LIMIT, remaining: Math.max(0, FREE_TIER_LIMIT - used), tier: "free" });
});

export default router;
