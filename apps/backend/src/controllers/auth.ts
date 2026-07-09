import type { Request, Response, NextFunction } from "express";
import { SignupBody, LoginBody } from "@workspace/types";
import { AuthService } from "../services/auth";
import type { JwtPayload } from "../lib/auth";

export class AuthController {
  static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = SignupBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      const result = await AuthService.signup(parsed.data);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = LoginBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      const result = await AuthService.login(parsed.data);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  static logout(_req: Request, res: Response): void {
    res.json({ message: "Logged out" });
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as Request & { user: JwtPayload }).user;
      const profile = await AuthService.getUserProfile(userId);
      res.json(profile);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
}
