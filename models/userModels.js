const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const userModels = {
    create: async (data) => {
        return await prisma.account.create({
            data: {
                User_Name: data.username,
                Email: data.email,
                Hashed_Password: data.password
            }
        })
    },

    findByUsername: async (username) => {
        return await prisma.account.findUnique({
            where: {
                User_Name: username
            }
        });
    },
};

module.exports = userModels;
