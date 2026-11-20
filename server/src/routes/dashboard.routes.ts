import { Router, type Router as ExpressRouter } from "express";
import { getDashboardSummaryController } from "../controllers/dashboard.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.get("/", getDashboardSummaryController);

export default router;
