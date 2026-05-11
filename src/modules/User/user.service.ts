import prisma from '@/config/prisma'
import { CreateUser, UpdateUser } from './user.types'
import { capitalize } from '@/utils/string'
import { hashPassword } from '@/utils/password'

const notDeleted = { deletedAt: null }

export async function users() {
    return await prisma.user.findMany({
        where: { ...notDeleted },
        take: 100
    })
}

export async function getUserById(id: string | undefined) {
    if (!id) return
    return await prisma.user.findUnique({
        where: { id: parseInt(id), ...notDeleted },
        include: {
            role: true
        }
    })
}

export async function createUser(data: CreateUser) {
    const { names, lastnames, password, ...userData } = data

    return await prisma.user.create({
        data: {
            names: capitalize(names),
            lastnames: capitalize(lastnames),
            password: await hashPassword(password),
            roleId: 2,
            ...userData
        }
    })
}

export async function updateUser(id: string | undefined, data: UpdateUser) {
    const { names, lastnames, password, ...userData } = data
    if (!id) return

    return await prisma.user.update({
        where: { id: parseInt(id), ...notDeleted },
        data: {
            names: capitalize(names),
            lastnames: capitalize(lastnames),
            password: await hashPassword(password),
            ...userData
        }
    })
}

export async function deleteUser(id: string | undefined) {
    if (!id) return
    return await prisma.user.update({
        where: { id: parseInt(id), ...notDeleted },
        data: {
            deletedAt: new Date()
        }
    })
}

export async function getUser(email: string, username: string) {
    return prisma.user.findFirst({
        where: {
            ...notDeleted,
            OR: [
                { email },
                { username }
            ]
        },
        include: { role: true }
    })
}