import { Router, type IRouter } from "express";
import { HealthController } from "../controllers/health";

const router: IRouter = Router();

router.get("/healthz", HealthController.getHealthz);

export default router;
