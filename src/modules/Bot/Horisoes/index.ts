import { execPlaywright } from '@/modules/Bot/index'
import LoginFlow from './modules/login.flow'
import BillFlow from './modules/bill.flow'
import RIPSFlow from './modules/rips.flow'
import * as horisoesService from './horisoes.service'
import { getPage } from '../bot.utils'
import { BillFilesType, EPSBotType, ProccessedBillsType } from '../bot.types'

async function HorisoesFlow(EPSBot: EPSBotType, bills: string[]) {
    const context = await execPlaywright()
    const page = await getPage(context)
    await page.goto('https://horizonte.driverp.com/web')

    let billsFiles: BillFilesType[] = []

    await LoginFlow(page)

    //* Get files
    billsFiles = await BillFlow(page, bills)
    billsFiles = await RIPSFlow(page, billsFiles)
    billsFiles = await horisoesService.getHEVFiles(billsFiles)

    //* Create 'radicacion' and upload files to 'SFTP'
    await EPSBot(page, billsFiles)

    const proccessedBills: ProccessedBillsType =
        billsFiles.map(({ files, ...data }) => ({
            ...data,
            files: files.map(
                ({ buffer, ...filesData }) => ({ ...filesData })),
        }))

    return proccessedBills
}

export default HorisoesFlow