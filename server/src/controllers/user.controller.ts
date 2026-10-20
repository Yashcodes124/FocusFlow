//reponsibilities-> recieve request and response , call service , return response
//don't know DB

import type { Request, Response } from "express";
import {
  createUserService,
  getUserById,
  loginUser,
} from "../services/user.service.js";
import {
  loginUserSchema,
  registerUserSchema,
} from "../validators/user.validator.js";
import { generateToken } from "../utils/jwt.js";
import { ZodError } from "zod";

type UserParams = {
  id: string;
};

/**
 * Controller to handle GET /users/:id requests
 */

export const getUserByIdController = async (
  req: Request<UserParams>,
  res: Response,
) => {
  if (req.user?.userId !== req.params.id) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }

  //1.extract the id from the route params(/users/:id)
  const { id } = req.params;

  //2.call service layer
  const user = await getUserById(id);

  //3.Return success response
  return res.status(200).json({
    success: true,
    data: user,
  });
};

export const createUserController = async (req: Request, res: Response) => {
  try {
    //1.Validate incoming HTTP request body against the Zod schema
    const validatedData = registerUserSchema.parse(req.body);

    //2.pass the validated data to the bussiness logic
    const user = await createUserService(validatedData);
    const token = generateToken(user.id);

    //3. return success response(201 created)
    return res.status(201).json({
      success: true,
      message: "User Created Successfully",
      user,
      token,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.flatten().fieldErrors,
      });
    }

    const statusCode =
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 409 ? "User already exists" : "Internal server error",
    });
  }
};

export const loginUserController = async (req: Request, res: Response) => {
  try {
    const credentials = loginUserSchema.parse(req.body);
    const result = await loginUser(credentials);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.flatten().fieldErrors,
      });
    }

    if (
      error instanceof Error &&
      error.message === "Invalid email or password"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getMeController = async (req: Request, res: Response) => {
  try {
    //get the userId
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    //fetch the user information
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    //send the user Profile excluding the passward
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
