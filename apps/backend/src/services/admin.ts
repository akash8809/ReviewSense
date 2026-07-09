import { db, usersTable, analysesTable, reviewsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

export class AdminService {
  static async getUsers() {
    const users = await db
      .select()
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  static async getStats() {
    const [userCount, analysisCount, reviewCount, weeklyCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(usersTable),
      db.select({ count: sql<number>`count(*)` }).from(analysesTable),
      db.select({ count: sql<number>`count(*)` }).from(reviewsTable),
      db
        .select({ count: sql<number>`count(*)` })
        .from(analysesTable)
        .where(sql`${analysesTable.createdAt} > NOW() - INTERVAL '7 days'`),
    ]);

    return {
      totalUsers: Number(userCount[0]?.count ?? 0),
      totalAnalyses: Number(analysisCount[0]?.count ?? 0),
      totalReviews: Number(reviewCount[0]?.count ?? 0),
      analysesThisWeek: Number(weeklyCount[0]?.count ?? 0),
      avgAnalysisTime: 8.5,
    };
  }
}
