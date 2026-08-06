//used for bussiness logic
//examples: Can user register?
// Is email already used?
// Hash password
// Validate business rules
// The service should not directly return HTTP responses.
import { findUserById } from "../repositories/user.repository.js";
//when user or  resource not exits
export const getUserById = async (id) => {
    //1.fetch user form repo
    const user = await findUserById(id);
    //2.Busssiness logic : check if user exists
    if (!user) {
        const error = new Error("User not found");
        //attach the source code
        error.statusCode = 404;
        throw error;
    }
    //OR if(!user) return null;
    //else RETURN the user if exists
    return user;
};
//# sourceMappingURL=user.service.js.map