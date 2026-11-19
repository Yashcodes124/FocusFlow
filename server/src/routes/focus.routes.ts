import { Router, type Router as ExpressRouter } from "express";
import {
  completeFocusSessionController,
  getFocusOverviewController,
  startFocusSessionController,
} from "../controllers/focus.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: ExpressRouter = Router();

router.use(authMiddleware);

router.get("/overview", getFocusOverviewController);
router.post("/sessions", startFocusSessionController);
router.patch("/sessions/:id/complete", completeFocusSessionController);

export default router;
