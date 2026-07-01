import { RadicacionCodesType } from "@/Bot/types"
import { COOSALUD_PASSWORD, COOSALUD_USER, SFTP_HOST, SFTP_PASSWORD, SFTP_PORT, SFTP_USER } from '@/config/env'

export const CREDENTIALS = {
    user: COOSALUD_USER,
    password: COOSALUD_PASSWORD
}

export const SFTP_CONNECTION = {
    host: SFTP_HOST,
    port: SFTP_PORT,
    user: SFTP_USER,
    password: SFTP_PASSWORD
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