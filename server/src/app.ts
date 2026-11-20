import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import { getAllowedCorsOrigins, validateEnvironment } from "./lib/env.js";
import { apiRateLimiter } from "./middlewares/rateLimit.middleware.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middlewares/error.middleware.js";
import userRoutes from "./routes/user.routes.js";
import taskRoutes from "./routes/task.routes.js";
import habitRoutes from "./routes/habit.routes.js";
import { categoryRoutes, tagRoutes } from "./routes/taxonomy.routes.js";
import focusRoutes from "./routes/focus.routes.js";
import noteRoutes from "./routes/note.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import aiRoutes from "./routes/ai.routes.js";

validateEnvironment();

const app: Express = express();

app.set("trust proxy", 1);

const allowedOrigins = getAllowedCorsOrigins();
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin requests (no Origin header), configured origins, and Cloud Run preview domains
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/[a-z0-9-]+\.run\.app$/i.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Basic hardening headers compatible with iframe previews
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json({ limit: "1mb" }));

// Minimal request logging outside tests
if (process.env.NODE_ENV !== "test") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        console.log(
          `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`,
        );
      }
    });
    next();
  });
}

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "ok" } });
});

// Mount API routes with general rate limiting
app.use("/api", apiRateLimiter);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/focus", focusRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);

// 404 for unknown API paths
app.use("/api", notFoundMiddleware);

// Serve built client SPA from client/dist
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const candidateDistDirs = [
  path.resolve(currentDir, "../../client/dist"),
  path.resolve(currentDir, "../../../client/dist"),
  path.resolve(process.cwd(), "client/dist"),
  path.resolve(process.cwd(), "../client/dist"),
];
const clientDistDir = candidateDistDirs.find((dir) =>
  fs.existsSync(path.join(dir, "index.html")),
);

if (clientDistDir) {
  const clientIndexHtml = path.join(clientDistDir, "index.html");
  app.use(express.static(clientDistDir));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(clientIndexHtml);
    }
    return next();
  });
} else {
  app.get("/", (_req, res) => {
    res.send("FocusFlow API is running.");
  });
}

app.use(errorMiddleware);

export default app;
