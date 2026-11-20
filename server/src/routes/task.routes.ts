import { Router, type Router as ExpressRouter } from "express";
import {
  addTaskAttachmentController,
  createTaskController,
  createTasksBulkController,
  deleteTaskAttachmentController,
  deleteTaskController,
  downloadTaskAttachmentController,
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
router.post("/:id/attachments", addTaskAttachmentController);
router.get(
  "/:id/attachments/:attachmentId/download",
  downloadTaskAttachmentController,
);
router.delete("/:id/attachments/:attachmentId", deleteTaskAttachmentController);

export default router;
