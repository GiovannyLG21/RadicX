import prisma from '@/config/prisma'
import { hashPassword } from '@/utils'

async function main() {
    await prisma.role.createMany({
        data: [
            { name: 'Super Administrador' },
            { name: 'Administrador' },
            { name: 'Usuario' }
        ]
    })

    await prisma.user.create({
        data: {
            names: 'Super',
            lastnames: 'Admin',
            role: {
                connect: { name: 'Super Administrador' }
            },
            username: 'admin@test',
            email: 'admin@test.com',
            password: await hashPassword('1234567890')
        }
    })

    await prisma.status.createMany({
        data: [
            { name: 'RUNNING' },
            { name: 'SUCCESS' },
            { name: 'FAILED' }
        ]
    })
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })