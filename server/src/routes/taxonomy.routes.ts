import { Router, type Router as ExpressRouter } from "express";
import {
  createCategoryController,
  createTagController,
  deleteCategoryController,
  deleteTagController,
  listCategoriesController,
  listTagsController,
  updateCategoryController,
  updateTagController,
} from "../controllers/taxonomy.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const categoryRoutes: ExpressRouter = Router();
categoryRoutes.use(authMiddleware);
categoryRoutes.get("/", listCategoriesController);
categoryRoutes.post("/", createCategoryController);
categoryRoutes.patch("/:id", updateCategoryController);
categoryRoutes.delete("/:id", deleteCategoryController);

export const tagRoutes: ExpressRouter = Router();
tagRoutes.use(authMiddleware);
tagRoutes.get("/", listTagsController);
tagRoutes.post("/", createTagController);
tagRoutes.patch("/:id", updateTagController);
tagRoutes.delete("/:id", deleteTagController);
