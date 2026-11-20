import type { NextFunction, Request, Response } from "express";
import { Errors } from "../lib/errors.js";
import {
  addTaskAttachmentService,
  createTaskService,
  createTasksBulkService,
  deleteTaskAttachmentService,
  deleteTaskService,
  downloadTaskAttachmentService,
  getTaskByIdService,
  listTasksService,
  toggleTaskCompleteService,
  updateTaskService,
} from "../services/task.service.js";
import { createAttachmentSchema } from "../validators/attachment.validator.js";
import {
  bulkCreateTasksSchema,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from "../validators/task.validator.js";

export const listTasksController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const query = listTasksQuerySchema.parse(req.query);
    const result = await listTasksService(userId, query);

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};

export const createTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = createTaskSchema.parse(req.body);
    const task = await createTaskService(payload, userId);

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: task,
    });
  } catch (error) {
    return next(error);
  }
};

export const createTasksBulkController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = bulkCreateTasksSchema.parse(req.body);
    const created = await createTasksBulkService(payload.tasks, userId);

    return res.status(201).json({
      success: true,
      message: `${created.length} ${created.length === 1 ? "task" : "tasks"} created successfully`,
      data: created,
    });
  } catch (error) {
    return next(error);
  }
};

export const getTaskByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const task = await getTaskByIdService(req.params.id, userId);
    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateTaskController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = updateTaskSchema.parse(req.body);
    const task = await updateTaskService(req.params.id, userId, payload);

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (error) {
    return next(error);
  }
};

export const toggleTaskCompleteController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const task = await toggleTaskCompleteService(req.params.id, userId);
    return res.status(200).json({
      success: true,
      message:
        task.status === "COMPLETED" ? "Task completed" : "Task reopened",
      data: task,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteTaskController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    await deleteTaskService(req.params.id, userId);
    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const addTaskAttachmentController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = createAttachmentSchema.parse(req.body);
    const attachment = await addTaskAttachmentService(
      req.params.id,
      userId,
      payload,
    );
    return res.status(201).json({
      success: true,
      message: "Attachment added",
      data: attachment,
    });
  } catch (error) {
    return next(error);
  }
};

export const downloadTaskAttachmentController = async (
  req: Request<{ id: string; attachmentId: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const file = await downloadTaskAttachmentService(
      req.params.id,
      req.params.attachmentId,
      userId,
    );

    const encodedFileName = encodeURIComponent(file.fileName);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.fileName.replace(/"/g, "")}"; filename*=UTF-8''${encodedFileName}`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(file.buffer);
  } catch (error) {
    return next(error);
  }
};

export const deleteTaskAttachmentController = async (
  req: Request<{ id: string; attachmentId: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    await deleteTaskAttachmentService(
      req.params.id,
      req.params.attachmentId,
      userId,
    );
    return res.status(200).json({
      success: true,
      message: "Attachment removed",
    });
  } catch (error) {
    return next(error);
  }
};
