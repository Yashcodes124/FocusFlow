import jwt from "jsonwebtoken";
import { getJwtSecret } from "../lib/env.js";

export interface JwtPayloadData {
  userId: string;
  tokenVersion: number;
}

export function generateToken(userId: string, tokenVersion = 0): string {
  return jwt.sign({ userId, tokenVersion }, getJwtSecret(), {
    expiresIn: "7d",
  });
}

export function verifyJwtToken(token: string): JwtPayloadData | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      typeof decoded.userId === "string"
    ) {
      const tokenVersion =
        typeof decoded.tokenVersion === "number" ? decoded.tokenVersion : 0;
      return { userId: decoded.userId, tokenVersion };
    }
    return null;
  } catch {
    return null;
  }
}
