import bcrypt from "bcryptjs";
import { Errors } from "../lib/errors.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  incrementUserTokenVersion,
  updateUserProfile,
  type UserRow,
} from "../repositories/user.repository.js";
import { generateToken } from "../utils/jwt.js";
import type {
  LoginUserInput,
  RegisterUserInput,
  UpdateProfileInput,
} from "../validators/user.validator.js";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  theme: "light" | "dark";
  language: "en" | "es" | "fr" | "de";
  timezone: string;
  focusDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  isEmailVerified: boolean;
  hasGoogleLink: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function sanitizeUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    theme: user.theme === "dark" ? "dark" : "light",
    language:
      user.language === "es" ||
      user.language === "fr" ||
      user.language === "de"
        ? user.language
        : "en",
    timezone: user.timezone,
    focusDurationMinutes: user.focusDurationMinutes,
    shortBreakMinutes: user.shortBreakMinutes,
    longBreakMinutes: user.longBreakMinutes,
    isEmailVerified: user.isEmailVerified,
    hasGoogleLink: Boolean(user.firebaseUid),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const getUserById = async (id: string): Promise<PublicUser> => {
  const user = await findUserById(id);
  if (!user) {
    throw Errors.notFound("User not found");
  }
  return sanitizeUser(user);
};

export const registerUserService = async (
  data: RegisterUserInput,
): Promise<{ user: PublicUser; token: string }> => {
  const existing = await findUserByEmail(data.email);
  if (existing) {
    throw Errors.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const created = await createUser({
    name: data.name,
    email: data.email,
    passwordHash,
    timezone: data.timezone,
  });

  const token = generateToken(created.id, created.tokenVersion);
  return {
    user: sanitizeUser(created),
    token,
  };
};

export const loginUserService = async (
  data: LoginUserInput,
): Promise<{ user: PublicUser; token: string }> => {
  const user = await findUserByEmail(data.email);
  if (!user || !user.passwordHash) {
    throw Errors.unauthorized("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) {
    throw Errors.unauthorized("Invalid email or password");
  }

  const token = generateToken(user.id, user.tokenVersion);
  return {
    user: sanitizeUser(user),
    token,
  };
};

export const logoutUserService = async (userId: string): Promise<void> => {
  await incrementUserTokenVersion(userId);
};

export const updateUserProfileService = async (
  userId: string,
  data: UpdateProfileInput,
): Promise<PublicUser> => {
  const updated = await updateUserProfile(userId, data);
  if (!updated) {
    throw Errors.notFound("User not found");
  }
  return sanitizeUser(updated);
};
