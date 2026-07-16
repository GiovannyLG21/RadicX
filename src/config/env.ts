import dotenv from 'dotenv'

dotenv.config({
    path: ['.env.local', '.env']
})

export const NODE_ENV = process.env.NODE_ENV
export const PORT = process.env.PORT
export const JWT_SECRET = String(process.env.JWT_SECRET)

export const REDIS_HOST = process.env.REDIS_HOST
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD
export const DATABASE_URL = process.env.DATABASE_URL
export const DATABASE_HOST = process.env.DATABASE_HOST
export const DATABASE_USER = process.env.DATABASE_USER
export const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD
export const DATABASE_NAME = process.env.DATABASE_NAME

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
export const GOOGLE_CODE = String(process.env.GOOGLE_CODE)
export const GOOGLE_REFRESH_TOKEN = String(process.env.GOOGLE_REFRESH_TOKEN)

export const ODOO_USER = String(process.env.ODOO_USER)
export const ODOO_PASSWORD = String(process.env.ODOO_PASSWORD)

export const COOSALUD_USER = String(process.env.COOSALUD_USER)
export const COOSALUD_PASSWORD = String(process.env.COOSALUD_PASSWORD)

export const SFTP_HOST = String(process.env.SFTP_HOST)
export const SFTP_PORT = Number(process.env.SFTP_PORT)
export const SFTP_USER = String(process.env.SFTP_USER)
export const SFTP_PASSWORD = String(process.env.SFTP_PASSWORD)

