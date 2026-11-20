import { Router, type Router as ExpressRouter } from "express";
import {
  createNoteController,
  deleteNoteController,
  extractTasksFromNoteController,
  getNoteByIdController,
  listNotesController,
  updateNoteController,
} from "../controllers/note.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: ExpressRouter = Router();

router.use(authMiddleware);

router.get("/", listNotesController);
router.post("/", createNoteController);
router.get("/:id", getNoteByIdController);
router.patch("/:id", updateNoteController);
router.delete("/:id", deleteNoteController);
router.post("/:id/extract-tasks", extractTasksFromNoteController);

export default router;
