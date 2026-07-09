import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { DashboardController } from "../controllers/dashboard";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, DashboardController.getStats);
router.get("/dashboard/recent", requireAuth, DashboardController.getRecent);
router.get("/dashboard/trend", requireAuth, DashboardController.getTrend);
router.get("/dashboard/usage", requireAuth, DashboardController.getUsage);

export default router;
