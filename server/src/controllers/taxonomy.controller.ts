import type { NextFunction, Request, Response } from "express";
import { Errors } from "../lib/errors.js";
import {
  createCategoryService,
  createTagService,
  deleteCategoryService,
  deleteTagService,
  listCategoriesService,
  listTagsService,
  updateCategoryService,
  updateTagService,
} from "../services/taxonomy.service.js";
import {
  createCategorySchema,
  createTagSchema,
  updateCategorySchema,
  updateTagSchema,
} from "../validators/taxonomy.validator.js";

export const listCategoriesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();
    const data = await listCategoriesService(userId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

export const createCategoryController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();
    const payload = createCategorySchema.parse(req.body);
    const data = await createCategoryService(userId, payload);
    return res.status(201).json({
      success: true,
      message: "Category created",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCategoryController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();
    const payload = updateCategorySchema.parse(req.body);
    const data = await updateCategoryService(req.params.id, userId, payload);
    return res.status(200).json({
      success: true,
      message: "Category updated",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteCategoryController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();
    await deleteCategoryService(req.params.id, userId);
    return res.status(200).json({
      success: true,
      message: "Category deleted",
    });
  } catch (error) {
    return next(error);
  }
};

export const listTagsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();
    const data = await listTagsService(userId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

export const createTagController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();
    const payload = createTagSchema.parse(req.body);
    const data = await createTagService(userId, payload);
    return res.status(201).json({
      success: true,
      message: "Tag created",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateTagController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();
    const payload = updateTagSchema.parse(req.body);
    const data = await updateTagService(req.params.id, userId, payload);
    return res.status(200).json({
      success: true,
      message: "Tag updated",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteTagController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw Errors.unauthorized();
    await deleteTagService(req.params.id, userId);
    return res.status(200).json({
      success: true,
      message: "Tag deleted",
    });
  } catch (error) {
    return next(error);
  }
};
