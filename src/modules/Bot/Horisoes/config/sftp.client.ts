import Client from 'ssh2-sftp-client'
import { SFTP_CREDENTIALS } from './config'

export async function sftpConnect(sftp: Client, callback: (sftp: Client) => void) {
    try {
        await sftp.connect({
            host: 'vco.ctamedicas.com',
            port: 22,
            username: SFTP_CREDENTIALS.user,
            password: SFTP_CREDENTIALS.password
        })
        await callback(sftp)
    } catch (error) {
        console.error(error)
    } finally {
        await sftp.end()
    }
}

