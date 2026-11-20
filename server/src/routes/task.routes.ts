import { Router, type Router as ExpressRouter } from "express";
import {
  createTaskController,
  createTasksBulkController,
  deleteTaskController,
  getTaskByIdController,
  listTasksController,
  toggleTaskCompleteController,
  updateTaskController,
} from "../controllers/task.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: ExpressRouter = Router();

router.use(authMiddleware);

router.get("/", listTasksController);
router.post("/", createTaskController);
router.post("/bulk", createTasksBulkController);
router.get("/:id", getTaskByIdController);
router.patch("/:id", updateTaskController);
router.patch("/:id/toggle", toggleTaskCompleteController);
router.delete("/:id", deleteTaskController);

export default router;
