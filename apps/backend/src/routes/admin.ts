import { Router, type IRouter } from "express";
import { requireAdmin } from "../middleware/auth";
import { AdminController } from "../controllers/admin";

const router: IRouter = Router();

// GET /admin/users
router.get("/admin/users", requireAdmin, AdminController.getUsers);

// GET /admin/stats
router.get("/admin/stats", requireAdmin, AdminController.getStats);

export default router;
