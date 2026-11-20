// Declaration augmentation for Express Request

import type {} from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        authProvider: "jwt" | "firebase";
      };
    }
  }
}
