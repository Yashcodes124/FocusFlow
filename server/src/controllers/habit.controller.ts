import type { NextFunction, Request, Response } from "express";
import { Errors } from "../lib/errors.js";
import {
  checkInHabitService,
  createHabitService,
  deleteHabitService,
  listHabitsService,
  updateHabitService,
} from "../services/habit.service.js";
import {
  checkInHabitSchema,
  createHabitSchema,
  updateHabitSchema,
} from "../validators/habit.validator.js";

function extractTimeZone(req: Request): string {
  const tz = req.query.timezone;
  return typeof tz === "string" && tz.trim().length > 0 ? tz.trim() : "UTC";
}

export const listHabitsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const habits = await listHabitsService(userId, extractTimeZone(req));
    return res.status(200).json({
      success: true,
      data: habits,
    });
  } catch (error) {
    return next(error);
  }
};

export const createHabitController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = createHabitSchema.parse(req.body);
    const habit = await createHabitService(
      userId,
      payload,
      extractTimeZone(req),
    );

    return res.status(201).json({
      success: true,
      message: "Habit created successfully",
      data: habit,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateHabitController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = updateHabitSchema.parse(req.body);
    const habit = await updateHabitService(
      req.params.id,
      userId,
      payload,
      extractTimeZone(req),
    );

    return res.status(200).json({
      success: true,
      message: "Habit updated successfully",
      data: habit,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteHabitController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    await deleteHabitService(req.params.id, userId);
    return res.status(200).json({
      success: true,
      message: "Habit deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const checkInHabitController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = checkInHabitSchema.parse(req.body ?? {});
    const habit = await checkInHabitService(req.params.id, userId, payload);

    return res.status(200).json({
      success: true,
      message: habit.completedToday
        ? "Habit checked in"
        : "Habit check-in updated",
      data: habit,
    });
  } catch (error) {
    return next(error);
  }
};
