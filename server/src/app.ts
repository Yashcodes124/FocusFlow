import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import taskRoutes from "./routes/task.routes.js";

const app: Express = express();

app.use(cors());
app.use(express.json());

// Mount API routes
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const clientDistDir = path.resolve(currentDir, "../../client/dist");
const clientIndexHtml = path.join(clientDistDir, "index.html");

if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.use((req, res, next) => {
    if (
      req.method === "GET" &&
      !req.path.startsWith("/api") &&
      fs.existsSync(clientIndexHtml)
    ) {
      return res.sendFile(clientIndexHtml);
    }
    return next();
  });
} else {
  app.get("/", (_req, res) => {
    res.send("Welcome to focusflow Api!");
  });
}

export default app;
