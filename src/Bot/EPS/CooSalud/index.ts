import { BrowserContext } from 'playwright'
import loginFlow from './modules/login.flow'
import radicacionFlow from './modules/radicacion.flow'
import { BillDataType, RadicacionCodesType } from '@/Bot/types'
import * as coosaludService from './coosalud.service'

async function CooSaludBot(context: BrowserContext, billData: BillDataType, radicacionCodes: RadicacionCodesType) {
    if (!billData.success || !billData.contract) return
    const page = await context.newPage()

    await page.goto('https://vco.ctamedicas.com/app/')

    await loginFlow(page)

    await page.goto('https://vco.ctamedicas.com/app/radicaciones')

    let radicacionCode = ''

    if (!radicacionCodes) {
        const radicacionCode = await radicacionFlow(page, billData)
    }

    await coosaludService.sftpUpload(radicacionCodes, billData)

    return radicacionCodes
}

export default CooSaludBot