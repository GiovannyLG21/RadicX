import { BrowserContext } from 'playwright'
import LoginFlow from './modules/login.flow'
import BillFlow from './modules/bill.flow'
import RIPSFlow from './modules/rips.flow'
import * as horisoesService from './horisoes.service'
import { BillDataType } from '@/Bot/types'

async function HorisoesBot(context: BrowserContext, bill: string) {
    const page = await context.newPage()
    await page.goto('https://horizonte.driverp.com/web')

    await LoginFlow(page)

    //* Get files
    let billData: BillDataType

    billData = await BillFlow(page, bill)
    billData = await RIPSFlow(page, billData)
    await page.close()

    billData = await horisoesService.getHEVFiles(billData)

    return billData
}

export default HorisoesBot