import type { Request, Response } from "express";
type UserParams = {
    id: string;
};
/**
 * Controller to handle GET /users/:id requests
 */
export declare const getUserByIdController: (req: Request<UserParams>, res: Response) => Promise<Response<any, Record<string, any>>>;
export {};
//# sourceMappingURL=user.controller.d.ts.map