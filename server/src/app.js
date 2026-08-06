import express from "express";
import userRoutes from "./routes/user.routes.js";
//cretes an instance of express application
const app = express();
app.use(express.json());
app.get("/", (req, res) => {
    res.send("Welcome to focusflow Api!");
});
//Mount the user routes under the /user prefix
app.use("/users", userRoutes);
//listen to port from server.ts
export default app;
//# sourceMappingURL=app.js.map