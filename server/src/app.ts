import "dotenv/config";
import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import taskRoutes from "./routes/task.routes.js";

//cretes an instance of express application
const app = express();

app.use(cors());
app.use(express.json());

//Mount the user routes under the /user prefix
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to focusflow Api!");
});
//listen to port from server.ts
export default app;
