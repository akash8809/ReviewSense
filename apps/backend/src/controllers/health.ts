import type { Request, Response } from "express";
import { HealthCheckResponse } from "@workspace/types";

export class HealthController {
  static getHealthz(_req: Request, res: Response): void {
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  }
}
