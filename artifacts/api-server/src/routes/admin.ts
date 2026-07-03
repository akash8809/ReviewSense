import { Router, type IRouter } from "express";
import { db, usersTable, analysesTable, reviewsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// GET /admin/users
router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [userCount, analysisCount, reviewCount, weeklyCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(usersTable),
    db.select({ count: sql<number>`count(*)` }).from(analysesTable),
    db.select({ count: sql<number>`count(*)` }).from(reviewsTable),
    db
      .select({ count: sql<number>`count(*)` })
      .from(analysesTable)
      .where(sql`${analysesTable.createdAt} > NOW() - INTERVAL '7 days'`),
  ]);

  res.json({
    totalUsers: Number(userCount[0]?.count ?? 0),
    totalAnalyses: Number(analysisCount[0]?.count ?? 0),
    totalReviews: Number(reviewCount[0]?.count ?? 0),
    analysesThisWeek: Number(weeklyCount[0]?.count ?? 0),
    avgAnalysisTime: 8.5,
  });
});

export default router;
