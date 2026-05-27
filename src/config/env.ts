import dotenv from 'dotenv'

dotenv.config()
export const NODE_ENV = process.env.NODE_ENV
export const PORT = process.env.PORT
export const JWT_SECRET = String(process.env.JWT_SECRET)

export const DATABASE_URL = process.env.DATABASE_URL
export const DATABASE_HOST = process.env.DATABASE_HOST
export const DATABASE_USER = process.env.DATABASE_USER
export const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD
export const DATABASE_NAME = process.env.DATABASE_NAME