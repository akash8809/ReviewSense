import type { Request, Response, NextFunction } from "express";
import {
  CreateAnalysisBody,
  UploadCsvAnalysisBody,
  GetAnalysisParams,
  DeleteAnalysisParams,
  GetAnalysisReviewsParams,
  ListAnalysesQueryParams,
} from "@workspace/types";
import { AnalysesService } from "../services/analyses";
import type { JwtPayload } from "../lib/auth";
import { logger } from "../lib/logger";

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

export class AnalysesController {
  static async listAnalyses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getUser(req);
      const qp = ListAnalysesQueryParams.safeParse(req.query);
      const search = qp.success ? (qp.data.search ?? "") : "";
      const page = qp.success ? (qp.data.page ?? 1) : 1;
      const limit = qp.success ? (qp.data.limit ?? 20) : 20;

      const result = await AnalysesService.listAnalyses(user.userId, search, page, limit);
      res.json(result);
    } catch (err) {
      logger.error({ err }, "Error in listAnalyses controller");
      next(err);
    }
  }

  static async createAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getUser(req);
      const parsed = CreateAnalysisBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      const result = await AnalysesService.createAnalysis(user.userId, parsed.data.productUrl);
      res.status(201).json(result);
    } catch (err) {
      logger.error({ err }, "Error in createAnalysis controller");
      next(err);
    }
  }

  static async uploadCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getUser(req);
      const parsed = UploadCsvAnalysisBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      const { productName, productBrand, reviews } = parsed.data;
      const result = await AnalysesService.createCsvAnalysis(user.userId, productName, productBrand, reviews);
      res.status(201).json(result);
    } catch (err) {
      logger.error({ err }, "Error in uploadCsv controller");
      next(err);
    }
  }

  static async getAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = GetAnalysisParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const user = getUser(req);
      const result = await AnalysesService.getAnalysis(params.data.id, user.userId);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  static async deleteAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = DeleteAnalysisParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const user = getUser(req);
      await AnalysesService.deleteAnalysis(params.data.id, user.userId);
      res.sendStatus(204);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  static async getAnalysisReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = GetAnalysisReviewsParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const user = getUser(req);
      const result = await AnalysesService.getAnalysisReviews(params.data.id, user.userId);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  static async shareAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = GetAnalysisParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const user = getUser(req);
      const result = await AnalysesService.shareAnalysis(params.data.id, user.userId);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  static async getPublicAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = String(req.params.token);
      const result = await AnalysesService.getPublicAnalysis(token);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  static async getSharedAnalysisDirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = String(req.params.token);
      console.log("Incoming share token:", token);
      const result = await AnalysesService.getPublicAnalysis(token);
      res.setHeader("Content-Type", "application/json");
      res.json(result);
    } catch (err: any) {
      res.setHeader("Content-Type", "application/json");
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  static async reanalyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = GetAnalysisParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const user = getUser(req);
      const result = await AnalysesService.reanalyze(params.data.id, user.userId);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
}
