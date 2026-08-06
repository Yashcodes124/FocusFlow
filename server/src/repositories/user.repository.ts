//ONly to communicate with prisma ( interacting with DB)
//example: createUser() , updateUser()

import prisma from "../lib/prisma.js";

export const findUserById = async (id: string) => {
  return await prisma.user.findUnique({
    where: {
      id,
    },
  });
}; //prisma auto handles NULL in case not exist

//Types for creating a user
export interface CreateUserData {
  name: string;
  email: string;
  password: string;
}
/**
find the user by  email in postgreSql
*/
export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: {
      email,
    },
  });
};

/**
 * Create a new user in postgreSql
 */

export const createUser = async (data: CreateUserData) => {
  return await prisma.user.create({
    data,
  });
};
