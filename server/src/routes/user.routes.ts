//define the end points(urls)
//call router functions and shouldn't have db logic

import { Router } from "express";
import { getUserByIdController } from "../controllers/user.controller.js";
import { createUserController } from "../controllers/user.controller.js";
import { getMeController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
// Map GET /:id (or /users/:id depending on how you mount it in app.ts)
router.get("/:id", getUserByIdController);
//POST /users
router.post("/users", createUserController);

// protected EndPoint
router.post("/me", authMiddleware, getMeController);

export default router;
