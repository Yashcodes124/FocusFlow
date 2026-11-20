import { Router, type Router as ExpressRouter } from "express";
import {
  createUserController,
  getMeController,
  getUserByIdController,
  loginUserController,
  logoutUserController,
  updateMeController,
} from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authRateLimiter } from "../middlewares/rateLimit.middleware.js";

const router: ExpressRouter = Router();

router.post("/register", authRateLimiter, createUserController);
router.post("/login", authRateLimiter, loginUserController);
router.post("/logout", authMiddleware, logoutUserController);
router.get("/me", authMiddleware, getMeController);
router.patch("/me", authMiddleware, updateMeController);
router.get("/:id", authMiddleware, getUserByIdController);

export default router;
