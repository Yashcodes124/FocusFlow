import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  //1.Read the authorization header
  const authHeader = req.headers.authorization; //req.header("Authorization")

  //2. check if the header exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access token missing or Invalid",
    });
  }

  //3.Exists So , Extract the token String by space: "Bearer <token>")
  const token = authHeader.split(" ")[1];

  try {
    //4.verify the token using the JWT Secret
    const secret = process.env.JWT_SECRET!;

    // Add this guard so TypeScript knows 'secret' is definitely a string
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    // 2. Validate BOTH token AND secret exist before verifying
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is missing or invalid",
      });
    }
    //type assertion or standard decode type defination
    const decoded = jwt.verify(token, secret) as unknown as { userId: string };

    // 5. Attach the userId to the request object
    req.user = {
      userId: decoded.userId,
    };

    // 6. Pass control to the next middleware or controller
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
