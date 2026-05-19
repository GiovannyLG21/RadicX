import { BrowserContext, Page } from 'playwright'
import LoginFlow from './modules/login.flow'
import BillFlow from './modules/bill.flow'
import RIPSFlow from './modules/rips.flow'
import * as horisoesService from './horisoes.service'
import { BillDataType } from '@/Bot/types'

async function HorisoesBot(context: BrowserContext, page: Page, bill: string) {
    await page.goto('https://horizonte.driverp.com/web')

    let billData: BillDataType = {
        bill,
        contract: null,
        success: true,
        status: 'SUCCESS',
        message: '',
        files: []
    }

    const login = await LoginFlow(context, page)
    if (typeof login == 'string') {
        billData.success = false
        billData.status = 'LOGIN_FAILED'
        billData.message = login
        return billData
    }

    //* Get files
    billData = await BillFlow(page, bill)
    billData = await RIPSFlow(page, billData)
    billData = await horisoesService.getHEVFiles(billData)

    return billData
}

export default HorisoesBot