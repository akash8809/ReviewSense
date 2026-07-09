import type { Request, Response, NextFunction } from "express";
import { AdminService } from "../services/admin";
import { logger } from "../lib/logger";

export class AdminController {
  static async getUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await AdminService.getUsers();
      res.json(users);
    } catch (err) {
      logger.error({ err }, "Error in getUsers controller");
      next(err);
    }
  }

  static async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await AdminService.getStats();
      res.json(stats);
    } catch (err) {
      logger.error({ err }, "Error in getStats controller");
      next(err);
    }
  }
}
