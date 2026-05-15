import { Page } from 'playwright'
import loginFlow from './modules/login.flow'
import radicacionFlow from './modules/radicacion.flow'
import { BillFilesType } from '../../bot.types'
import * as coosaludService from './coosalud.service'

async function CoosaludBot(page: Page, billsFiles: BillFilesType[]) {
    const availableBills = billsFiles.some(bill => bill.success && bill.contract != null)
    if (!availableBills) return

    await page.goto('https://vco.ctamedicas.com/app/')

    await loginFlow(page)

    await page.goto('https://vco.ctamedicas.com/app/radicaciones')

    const radicacionCodes = await radicacionFlow(page, billsFiles)

    await coosaludService.sftpUpload(radicacionCodes, billsFiles)    
}

export default CoosaludBot