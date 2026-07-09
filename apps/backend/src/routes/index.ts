import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import analysesRouter from "./analyses";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(analysesRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
