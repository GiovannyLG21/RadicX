import z from 'zod'
import userScheme from './user.scheme'
import { Prisma } from '@/prisma/generated/client'

export type User = Prisma.UserGetPayload<{
    include: {
        role: true
    }
}>
export type CreateUser = z.infer<typeof userScheme>
export type UpdateUser = CreateUser