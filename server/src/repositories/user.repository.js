//ONly to communicate with prisma ( interacting with DB)
//example: createUser() , updateUser()
import prisma from "../lib/prisma.js";
export const findUserById = async (id) => {
    return await prisma.user.findUnique({
        where: {
            id: id,
        },
    });
}; //prisma auto handles NULL in case not exist
//# sourceMappingURL=user.repository.js.map