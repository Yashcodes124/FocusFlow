import jwt from "jsonwebtoken";

export function generateToken(userId: string) {
  const secret = process.env.JWT_SECRET || "focusflow-dev-secret";
  return jwt.sign(
    { userId },
    //telling ts that 'value-string' exists for sure: Non-Null Assertion (!)
    secret,
    { expiresIn: "7d" },
  );
}
