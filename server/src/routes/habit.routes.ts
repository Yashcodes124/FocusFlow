import { Router, type Router as ExpressRouter } from "express";
import {
  checkInHabitController,
  createHabitController,
  deleteHabitController,
  listHabitsController,
  updateHabitController,
} from "../controllers/habit.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: ExpressRouter = Router();

router.use(authMiddleware);

router.get("/", listHabitsController);
router.post("/", createHabitController);
router.patch("/:id", updateHabitController);
router.delete("/:id", deleteHabitController);
router.post("/:id/check-in", checkInHabitController);

export default router;
