//define the end points(urls)
//call router functions and shouldn't have db logic
import { Router } from "express";
import { getUserByIdController } from "../controllers/user.controller.js";
const router = Router();
// Map GET /:id (or /users/:id depending on how you mount it in app.ts)
router.get("/:id", getUserByIdController);
export default router;
//# sourceMappingURL=user.routes.js.map