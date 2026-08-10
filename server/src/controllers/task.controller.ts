import type { Request, Response } from "express";
import { ZodError } from "zod";
import { createTaskService } from "../services/task.service.js";

export const createTaskController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const task = await createTaskService(req.body, userId);

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: task,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.flatten().fieldErrors,
      });
    }

    const statusCode = (error as any).statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: (error as Error).message || "Internal server error",
    });
  }
};
