import type { NextFunction, Request, Response } from "express";
import { verifyJwtToken } from "../utils/jwt.js";
import { adminAuth } from "../lib/firebase-admin.js";
import {
  findUserById,
  upsertFirebaseUser,
} from "../repositories/user.repository.js";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.match(/^Bearer\s+(\S+)$/i)?.[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      message: "Access token missing or invalid",
    });
  }

  // 1. Try FocusFlow JWT verification first
  const jwtPayload = verifyJwtToken(token);
  if (jwtPayload) {
    try {
      const user = await findUserById(jwtPayload.userId);
      if (!user || user.tokenVersion !== jwtPayload.tokenVersion) {
        return res.status(401).json({
          success: false,
          code: "SESSION_EXPIRED",
          message: "Session has expired. Please sign in again.",
        });
      }
      req.user = {
        userId: user.id,
        email: user.email,
        authProvider: "jwt",
      };
      return next();
    } catch (error) {
      return next(error);
    }
  }

  // 2. Fallback to Firebase Auth ID Token verification (Google Sign-In, when configured)
  if (!adminAuth) {
    return res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      message: "Invalid or expired token",
    });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email;
    if (!email) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Verified account email is required",
      });
    }

    const user = await upsertFirebaseUser({
      firebaseUid: decoded.uid,
      email,
      name: decoded.name || email.split("@")[0] || "FocusFlow User",
      isEmailVerified: Boolean(decoded.email_verified),
    });

    req.user = {
      userId: user.id,
      email: user.email,
      authProvider: "firebase",
    };
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      message: "Invalid or expired token",
    });
  }
};
