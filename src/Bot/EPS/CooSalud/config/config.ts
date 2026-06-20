import { RadicacionCodesType } from "@/Bot/types"

export const CREDENTIALS = {
    user: String(process.env.COOSALUD_USER),
    password: String(process.env.COOSALUD_PASSWORD)
}

export const SFTP_CONNECTION = {
    host: String(process.env.SFTP_HOST),
    port: Number(process.env.SFTP_PORT),
    user: String(process.env.SFTP_USER),
    password: String(process.env.SFTP_PASSWORD)
}

export const CONTRACTS: RadicacionCodesType = [
    {
        contract: 'Contributivo',
        code: 'NAL00C47051567-25'
    },
    {
        contract: 'Subsidiado',
        code: 'NAL00S47051564-25'
    }
]