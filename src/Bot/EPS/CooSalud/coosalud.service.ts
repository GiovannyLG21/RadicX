import Client from 'ssh2-sftp-client'
import { SFTP_CREDENTIALS } from '../CooSalud/config/config'
import { BillDataType, RadicacionCodesType } from '../../types'

export async function sftpUpload(radicacionCodes: RadicacionCodesType | undefined, billData: BillDataType) {
    if (!radicacionCodes || !radicacionCodes.length) return
    console.log(radicacionCodes)
    const sftp = new Client()
    try {
        await sftp.connect({
            host: 'vco.ctamedicas.com',
            port: 22,
            username: SFTP_CREDENTIALS.user,
            password: SFTP_CREDENTIALS.password
        })

        if (!billData.success) return
        const radicacionCode = radicacionCodes.find(radicacion => radicacion.contract == billData.contract)!.code
        const bill = billData.bill
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
    } catch (error) {
        console.error(error)
        return
    } finally {
        await sftp.end()
    }
}