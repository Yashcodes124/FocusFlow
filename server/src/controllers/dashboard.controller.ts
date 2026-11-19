import type { NextFunction, Request, Response } from "express";
import { Errors } from "../lib/errors.js";
import { getDashboardSummaryService } from "../services/dashboard.service.js";

export const getDashboardSummaryController = async (
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
    const data = await getDashboardSummaryService(userId, tz);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};
