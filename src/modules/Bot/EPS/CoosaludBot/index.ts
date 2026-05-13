import { Page } from 'playwright'
import loginFlow from './modules/login.flow'
import radicacionFlow from './modules/radicacion.flow'
import { BillFilesType } from '../../bot.types'

async function CoosaludBot(page: Page, billsFiles: BillFilesType[]) {
    const availableBills = billsFiles.some(bill => bill.success && bill.contract != null)
    if (!availableBills) return

    await page.goto('https://vco.ctamedicas.com/app/')

    await loginFlow(page)

    await page.goto('https://vco.ctamedicas.com/app/radicaciones')
    const radicacionCodes = await radicacionFlow(page, billsFiles)

    return radicacionCodes
}

export default CoosaludBot