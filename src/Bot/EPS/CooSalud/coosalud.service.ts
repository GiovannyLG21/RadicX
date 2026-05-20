import Client from 'ssh2-sftp-client'
import { SFTP_CREDENTIALS } from '../CooSalud/config/config'
import { BillDataType } from '../../types'
import util from 'node:util'
import { formatError } from '@/Bot/utils'

export async function sftpUpload(billData: BillDataType) {
    if (!billData.success || !billData.radicado) return billData
    const sftp = new Client()
    try {
        await sftp.connect({
            host: 'vco.ctamedicas.com',
            port: 22,
            username: SFTP_CREDENTIALS.user,
            password: SFTP_CREDENTIALS.password
        })

        const bill = billData.bill
        const radicacionCode = billData.radicado
        const IMGFiles = billData.files.filter(file => file.code == 'XML' || file.code == 'FEV' || file.code == 'HEV')
        const RIPSFiles = billData.files.filter(file => file.code == 'CUV' || file.code == 'RIPS')

        for (const file of RIPSFiles) {
            await sftp.put(file.buffer, `/${radicacionCode}/RIPS/${file.name}`)
        }

        const actualDirectory = await sftp.exists(`/${radicacionCode}/IMG/${bill}`)
        if (!actualDirectory) await sftp.mkdir(`/${radicacionCode}/IMG/${bill}`)
        for (const file of IMGFiles) {
            await sftp.put(file.buffer, `/${radicacionCode}/IMG/${bill}/${file.name}`)
        }

        billData.message = 'Factura, RIPS & HEV cargados en sftp'
        return billData
    } catch (err: any) {
        await sftp.end()
        console.error(err.message)
        billData.success = false
        billData.status = 'SFTP_ERROR'
        billData.message = `Error al cargar archivos en sftp: ${formatError(err.message)}`
        return billData
    } finally {
        await sftp.end()
    }
}

export async function getSftpFiles(radicado: string | undefined) {
    if (!radicado) return
    const sftp = new Client()
    try {
        await sftp.connect({
            host: 'vco.ctamedicas.com',
            port: 22,
            username: SFTP_CREDENTIALS.user,
            password: SFTP_CREDENTIALS.password
        })

        const radicadoFolders = await sftp.list(`/${radicado}/IMG`)

        return radicadoFolders.map(folder => folder.name)
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