//reponsibilities-> recieve request and response , call service , return response
//don't know DB
import { getUserById } from "../services/user.service.js";
/**
 * Controller to handle GET /users/:id requests
 */
export const getUserByIdController = async (req, res) => {
    try {
        //1.extract the id from the route params(/users/:id)
        const { id } = req.params;
        //2.call service layer
        const user = await getUserById(id);
        //3.Return success response
        return res.status(200).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        //4.handle errors(eg: user not found or Bad response)
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};
//# sourceMappingURL=user.controller.js.map