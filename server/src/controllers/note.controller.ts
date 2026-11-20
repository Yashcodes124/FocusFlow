import type { NextFunction, Request, Response } from "express";
import { Errors } from "../lib/errors.js";
import {
  createNoteService,
  deleteNoteService,
  extractTasksFromNoteService,
  getNoteByIdService,
  listNotesService,
  updateNoteService,
} from "../services/note.service.js";
import { extractActionItemsFromNote } from "../utils/noteExtractor.js";
import {
  createNoteSchema,
  extractNoteTasksSchema,
  updateNoteSchema,
} from "../validators/note.validator.js";

export const listNotesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;
    const categoryId =
      typeof req.query.categoryId === "string" && req.query.categoryId
        ? req.query.categoryId
        : undefined;

    const data = await listNotesService(userId, { search, categoryId });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

export const getNoteByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();
    const note = await getNoteByIdService(req.params.id, userId);
    const detectedActions = extractActionItemsFromNote(note.content);
    return res.status(200).json({
      success: true,
      data: { ...note, detectedActions },
    });
  } catch (error) {
    return next(error);
  }
};

export const createNoteController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = createNoteSchema.parse(req.body);
    const note = await createNoteService(userId, payload);
    return res.status(201).json({
      success: true,
      message: "Note created",
      data: note,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateNoteController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = updateNoteSchema.parse(req.body);
    const note = await updateNoteService(req.params.id, userId, payload);
    return res.status(200).json({
      success: true,
      message: "Note saved",
      data: note,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteNoteController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    await deleteNoteService(req.params.id, userId);
    return res.status(200).json({
      success: true,
      message: "Note deleted",
    });
  } catch (error) {
    return next(error);
  }
};

export const extractTasksFromNoteController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = extractNoteTasksSchema.parse(req.body ?? {});
    const result = await extractTasksFromNoteService(
      req.params.id,
      userId,
      payload,
    );

    return res.status(201).json({
      success: true,
      message:
        result.extractedCount > 0
          ? `Created ${result.extractedCount} task${result.extractedCount === 1 ? "" : "s"} from note`
          : "No actionable items found in note",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
