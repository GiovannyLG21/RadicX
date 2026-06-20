import { PrismaClient } from '@/prisma/generated/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import {
    DATABASE_HOST,
    DATABASE_USER,
    DATABASE_PASSWORD,
    DATABASE_NAME,
} from './env'

const adapter = new PrismaMariaDb({
    host: DATABASE_HOST ? DATABASE_HOST : '127.0.0.1',
    user: DATABASE_USER ? DATABASE_USER : 'root',
    password: DATABASE_PASSWORD ? DATABASE_PASSWORD : '',
    database: String(DATABASE_NAME),
    connectionLimit: 5
});

const globalForPrisma = global as typeof globalThis & {
    prisma?: PrismaClient
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })
globalForPrisma.prisma = prisma

export default prisma