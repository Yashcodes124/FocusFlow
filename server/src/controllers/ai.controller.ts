import type { NextFunction, Request, Response } from "express";
import { Errors } from "../lib/errors.js";
import { decomposeTaskGoalService } from "../services/ai.service.js";
import { decomposeTaskRequestSchema } from "../validators/ai.validator.js";

export const decomposeTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = decomposeTaskRequestSchema.parse(req.body);
    const result = await decomposeTaskGoalService(userId, payload);

    return res.status(payload.autoCreate ? 201 : 200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
