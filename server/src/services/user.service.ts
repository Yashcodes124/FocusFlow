//used for bussiness logic
//examples: Can user register?
// Is email already used?
// Hash password
// Validate business rules
// The service should not directly return HTTP responses.

import bcrypt from "bcrypt";
import { findUserById } from "../repositories/user.repository.js";
import {
  findUserByEmail,
  createUser,
} from "../repositories/user.repository.js";
import type { CreateUserData } from "../repositories/user.repository.js";

import { generateToken } from "../utils/jwt.js";

//when user or  resource not exits

export const getUserById = async (id: string) => {
  //1.fetch user form repo
  const user = await findUserById(id);
  //2.Busssiness logic : check if user exists
  if (!user) {
    const error = new Error("User not found");
    //attach the source code
    (error as any).statusCode = 404;
    throw error;
  }
  //OR if(!user) return null;

  // Remove sensitive fields before returning to the controller
  const { password, ...userWithoutPassword } = user;

  return userWithoutPassword;
};

export type createUserServiceInput = CreateUserData;

//user creation with bussiness validation and passsward hashing
export const createUserService = async (data: createUserServiceInput) => {
  //Check if user already exists
  const existingUser = await findUserByEmail(data.email);
  if (existingUser) {
    const error = new Error("User already exists");
    (error as any).statusCode = 409;
    throw error;
  }

  //if not exists then

  //2. hash passsward
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(data.password, saltRounds);

  //3. Save the user with the hashed passward
  const newUser = await createUser({
    ...data,
    password: hashedPassword,
  });

  // 4. Omit sensitive information before returning
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

// ========================== Set Login =================================

export const loginUser = async (data: { email: string; password: string }) => {
  //1.find the user from DB
  const user = await findUserByEmail(data.email);
  if (!user) {
    //Generic(same) error to prevent email enumeration
    throw new Error("Invalid email or password");
  }

  //2.compare the plain passward with hashed password
  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  //3.Generate JWT token
  const token = generateToken(user.id);

  //4.send the user (omit password) and token
  const { password, ...userWithoutPassword } = user;

  //
  return {
    user: userWithoutPassword,
    token,
  };
};
