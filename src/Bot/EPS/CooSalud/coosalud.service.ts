import Client from 'ssh2-sftp-client'
import { SFTP_CREDENTIALS } from '../CooSalud/config/config'

export async function getSftpFiles(folderCode: string | undefined) {
    if (!folderCode) return
    const sftp = new Client()
    try {
        await sftp.connect({
            host: 'vco.ctamedicas.com',
            port: 22,
            username: SFTP_CREDENTIALS.user,
            password: SFTP_CREDENTIALS.password
        })

        const BillsFolders = await sftp.list(`/${folderCode}/IMG`)
        return BillsFolders.map(folder => folder.name)
    } catch (err: any) {
        console.error(err.message)
        return
    } finally {
        sftp.end()
    }
}

export async function getAllSftpFiles(radicados: string[]) {
    const sftp = new Client()
    try {
        await sftp.connect({
            host: 'vco.ctamedicas.com',
            port: 22,
            username: SFTP_CREDENTIALS.user,
            password: SFTP_CREDENTIALS.password
        })

        const processedBills = await Promise.all(
            radicados.map(async radicado => {
                const folders = (await (sftp.list(`/${radicado}/IMG`))).map(folder => folder.name)
                return {
                    radicado,
                    total_facturas: folders.length,
                    facturas: folders
                }
            })
        )

        return processedBills
    } catch (err: any) {
        console.error(err.message)
        return
    } finally {
        sftp.end()
    }
}