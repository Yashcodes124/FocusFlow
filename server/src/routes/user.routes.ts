//define the end points(urls)
//call router functions and shouldn't have db logic

import { Router } from "express";
import {
  createUserController,
  getMeController,
  getUserByIdController,
  loginUserController,
} from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", createUserController);
router.post("/users", createUserController);
router.post("/login", loginUserController);
router.get("/me", authMiddleware, getMeController);
router.get("/:id", authMiddleware, getUserByIdController);

export default router;
