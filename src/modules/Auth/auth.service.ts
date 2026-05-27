import { JWT_SECRET } from '@/config/env'
import { Register, User } from './auth.types'
import jwt from 'jsonwebtoken'
import prisma from '@/config/prisma'
import { hashPassword } from '@/utils'
import { JWTPayload } from '@/types'

export async function createSession(data: User) {
    const { id, username, email, role } = data

    const payload: JWTPayload = {
        sub: String(id),
        data: {
            username,
            email,
            role: role.name
        }
    }

    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

export async function registerUser(data: Register) {
    return await prisma.user.create({
        data: {
            ...data,
            password: await hashPassword(data.password),
            roleId: 2,
        }
    })
}