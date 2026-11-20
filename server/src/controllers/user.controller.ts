import type { NextFunction, Request, Response } from "express";
import { Errors } from "../lib/errors.js";
import {
  getUserById,
  loginUserService,
  logoutUserService,
  registerUserService,
  updateUserProfileService,
} from "../services/user.service.js";
import {
  loginUserSchema,
  registerUserSchema,
  updateProfileSchema,
} from "../validators/user.validator.js";

export const createUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validated = registerUserSchema.parse(req.body);
    const { user, token } = await registerUserService(validated);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: { user, token },
      user,
      token,
    });
  } catch (error) {
    return next(error);
  }
};

export const loginUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const credentials = loginUserSchema.parse(req.body);
    const { user, token } = await loginUserService(credentials);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user, token },
      user,
      token,
    });
  } catch (error) {
    return next(error);
  }
};

export const logoutUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();
    await logoutUserService(userId);

    return res.status(200).json({
      success: true,
      message: "Signed out successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const getMeController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const user = await getUserById(userId);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateMeController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();

    const payload = updateProfileSchema.parse(req.body);
    const user = await updateUserProfileService(userId, payload);

    return res.status(200).json({
      success: true,
      message: "Profile updated",
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};

export const getUserByIdController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) throw Errors.unauthorized();
    if (req.user.userId !== req.params.id) {
      throw Errors.forbidden();
    }

    const user = await getUserById(req.params.id);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};
