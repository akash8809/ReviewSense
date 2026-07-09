import type { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/dashboard";
import type { JwtPayload } from "../lib/auth";
import { logger } from "../lib/logger";

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

export class DashboardController {
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getUser(req);
      const stats = await DashboardService.getStats(user.userId);
      res.json(stats);
    } catch (err) {
      logger.error({ err }, "Error in getStats dashboard controller");
      next(err);
    }
  }

  static async getRecent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getUser(req);
      const recent = await DashboardService.getRecent(user.userId);
      res.json(recent);
    } catch (err) {
      logger.error({ err }, "Error in getRecent dashboard controller");
      next(err);
    }
  }

  static async getTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getUser(req);
      const trend = await DashboardService.getTrend(user.userId);
      res.json(trend);
    } catch (err) {
      logger.error({ err }, "Error in getTrend dashboard controller");
      next(err);
    }
  }

  static async getUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getUser(req);
      const usage = await DashboardService.getUsage(user.userId);
      res.json(usage);
    } catch (err) {
      logger.error({ err }, "Error in getUsage dashboard controller");
      next(err);
    }
  }
}
