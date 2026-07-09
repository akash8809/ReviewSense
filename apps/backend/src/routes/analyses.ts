import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { AnalysesController } from "../controllers/analyses";

const router: IRouter = Router();

// GET /analyses
router.get("/analyses", requireAuth, AnalysesController.listAnalyses);

// POST /analyses
router.post("/analyses", requireAuth, AnalysesController.createAnalysis);

// POST /analyses/upload-csv
router.post("/analyses/upload-csv", requireAuth, AnalysesController.uploadCsv);

// GET /analyses/:id
router.get("/analyses/:id", requireAuth, AnalysesController.getAnalysis);

// DELETE /analyses/:id
router.delete("/analyses/:id", requireAuth, AnalysesController.deleteAnalysis);

// GET /analyses/:id/reviews
router.get("/analyses/:id/reviews", requireAuth, AnalysesController.getAnalysisReviews);

// POST /analyses/:id/share
router.post("/analyses/:id/share", requireAuth, AnalysesController.shareAnalysis);

// GET /public/analyses/:token — no auth required
router.get("/public/analyses/:token", AnalysesController.getPublicAnalysis);

// GET /shared/:token — no auth required
router.get("/shared/:token", AnalysesController.getSharedAnalysisDirect);

// POST /analyses/:id/reanalyze
router.post("/analyses/:id/reanalyze", requireAuth, AnalysesController.reanalyze);

export default router;
