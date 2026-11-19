import type { NextFunction, Request, Response } from "express";
import { Errors } from "../lib/errors.js";
import {
  completeFocusSessionService,
  getFocusOverviewService,
  startFocusSessionService,
} from "../services/focus.service.js";
import {
  completeFocusSessionSchema,
  startFocusSessionSchema,
} from "../validators/focus.validator.js";

export const getFocusOverviewController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const tz =
      typeof req.query.timezone === "string" && req.query.timezone.trim()
        ? req.query.timezone.trim()
        : "UTC";
    const data = await getFocusOverviewService(userId, tz);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const startFocusSessionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = startFocusSessionSchema.parse(req.body ?? {});
    const session = await startFocusSessionService(userId, payload);

    return res.status(201).json({
      success: true,
      message: "Focus session started",
      data: session,
    });
  } catch (error) {
    return next(error);
  }
};

export const completeFocusSessionController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = completeFocusSessionSchema.parse(req.body);
    const session = await completeFocusSessionService(
      req.params.id,
      userId,
      payload,
    );

    return res.status(200).json({
      success: true,
      message:
        session.status === "COMPLETED"
          ? "Focus session recorded"
          : "Focus session cancelled",
      data: session,
    });
  } catch (error) {
    return next(error);
  }
};
