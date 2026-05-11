import { execPlaywright } from '@/modules/Bot/index'
import { BillFilesType, EPSBotType } from '../bot.types'
import { getPage } from '../bot.utils'
import LoginFlow from './modules/login.flow'
import BillFlow from './modules/bill.flow'
import { RIPSFlow } from './modules/rips.flow'
import HEVFlow from './modules/hev.flow'
import Client from 'ssh2-sftp-client'
import { sftpConnect } from './config/sftp.client'


async function HorisoesBot(EPSBot: EPSBotType, bills: string[]) {
    const context = await execPlaywright()
    const page = await getPage(context)
    await page.goto('https://horizonte.driverp.com/web')

    await LoginFlow(page)

    let billsFiles: BillFilesType[]

    billsFiles = await BillFlow(page, bills)
    if (billsFiles.length == 0) return 'Facturas no encontradas'

    billsFiles = await RIPSFlow(page, billsFiles)

    billsFiles = await HEVFlow(billsFiles)

    // const radicacionCode = await EPSBot(context)
    const radicacionCode = '504539_20260511_123004'

    const client = new Client()
    await sftpConnect(client, async (sftp) => {
        for (const entry of billsFiles) {
            const bill = entry.bill
            const IMGFiles = entry.files.filter(file => file.code == 'XML' || file.code == 'FEV' || file.code == 'HEV')
            const RIPSFiles = entry.files.filter(file => file.code == 'CUV' || file.code == 'RIPS')

            for (const file of RIPSFiles) {
                await sftp.put(file.buffer, `/${radicacionCode}/RIPS/${file.name}`)
            }

            const actualDirectory = await sftp.exists(`/${radicacionCode}/IMG/${bill}`)
            if (!actualDirectory) await sftp.mkdir(`/${radicacionCode}/IMG/${bill}`)
            for (const file of IMGFiles) {
                await sftp.put(file.buffer, `/${radicacionCode}/IMG/${bill}/${file.name}`)
            }
        }
    })    
}

export default HorisoesBot