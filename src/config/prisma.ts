import { PrismaClient } from '@/prisma/generated/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import {
    NODE_ENV,
    DATABASE_HOST,
    DATABASE_PORT,
    DATABASE_USER,
    DATABASE_PASSWORD,
    DATABASE_NAME,
    DATABASE_TEST
} from './env'

const adapter = new PrismaMariaDb({
    host: DATABASE_HOST ? DATABASE_HOST : '127.0.0.1',
    port: Number(DATABASE_PORT) ? Number(DATABASE_PORT) : 3306,
    user: DATABASE_USER ? DATABASE_USER : 'root',
    password: DATABASE_PASSWORD ? DATABASE_PASSWORD : '',
    database: String(DATABASE_NAME),
    connectionLimit: 5
});

const prisma = new PrismaClient({ adapter })

export default prisma

