import { Router, type Router as ExpressRouter } from "express";
import { decomposeTaskController } from "../controllers/ai.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { aiRateLimiter } from "../middlewares/rateLimit.middleware.js";

const router: ExpressRouter = Router();

router.use(authMiddleware);
router.post("/decompose-task", aiRateLimiter, decomposeTaskController);

export default router;
