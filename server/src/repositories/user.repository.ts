import { eq, sql } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import { users } from "../../../src/db/schema.js";

export type UserRow = typeof users.$inferSelect;

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  timezone?: string;
}

export interface UpsertFirebaseUserData {
  firebaseUid: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
}

export interface UpdateUserProfileData {
  name?: string;
  theme?: string;
  language?: string;
  timezone?: string;
  focusDurationMinutes?: number;
  shortBreakMinutes?: number;
  longBreakMinutes?: number;
}

export const findUserById = async (id: string): Promise<UserRow | null> => {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
};

export const findUserByEmail = async (
  email: string,
): Promise<UserRow | null> => {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
};

export const createUser = async (data: CreateUserData): Promise<UserRow> => {
  const rows = await db
    .insert(users)
    .values({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      timezone: data.timezone || "UTC",
    })
    .returning();
  return rows[0]!;
};

export const upsertFirebaseUser = async (
  data: UpsertFirebaseUserData,
): Promise<UserRow> => {
  const normalizedEmail = data.email.toLowerCase();

  // First check if a user with this email already exists so we can link Firebase UID cleanly
  const existingByEmail = await findUserByEmail(normalizedEmail);
  if (existingByEmail) {
    if (existingByEmail.firebaseUid !== data.firebaseUid) {
      const updated = await db
        .update(users)
        .set({
          firebaseUid: data.firebaseUid,
          isEmailVerified: existingByEmail.isEmailVerified || data.isEmailVerified,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingByEmail.id))
        .returning();
      return updated[0]!;
    }
    return existingByEmail;
  }

  const rows = await db
    .insert(users)
    .values({
      firebaseUid: data.firebaseUid,
      email: normalizedEmail,
      name: data.name,
      isEmailVerified: data.isEmailVerified,
    })
    .onConflictDoUpdate({
      target: users.firebaseUid,
      set: {
        email: normalizedEmail,
        name: data.name,
        isEmailVerified: data.isEmailVerified,
        updatedAt: new Date(),
      },
    })
    .returning();

  return rows[0]!;
};

export const updateUserProfile = async (
  id: string,
  data: UpdateUserProfileData,
): Promise<UserRow | null> => {
  const rows = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  return rows[0] ?? null;
};

export const incrementUserTokenVersion = async (id: string): Promise<void> => {
  await db
    .update(users)
    .set({
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
};

export const deleteUserById = async (id: string): Promise<boolean> => {
  const rows = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning({ id: users.id });
  return rows.length > 0;
};
