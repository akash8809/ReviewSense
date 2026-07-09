import { Router, type IRouter } from "express";
import { AuthController } from "../controllers/auth";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.post("/auth/signup", AuthController.signup);
router.post("/auth/login", AuthController.login);
router.post("/auth/logout", AuthController.logout);
router.get("/auth/me", requireAuth, AuthController.me);

export default router;
