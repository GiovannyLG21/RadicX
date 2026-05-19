import { BrowserContext, Page } from 'playwright'
import loginFlow from './modules/login.flow'
import radicacionFlow from './modules/radicacion.flow'
import { BillDataType, RadicacionCodesType } from '@/Bot/types'
import * as coosaludService from './coosalud.service'

async function CooSaludBot(context: BrowserContext, page: Page, billData: BillDataType, radicacionCodes: RadicacionCodesType) {
    if (!billData.success || !billData.contract) return billData

    const radicacionCode = radicacionCodes?.find(radicacion => radicacion.contract == billData.contract)
    if (radicacionCode) billData.radicado = radicacionCode.code

    if (!radicacionCode) {
        await page.goto('https://vco.ctamedicas.com/app/')
        const login = await loginFlow(context, page)
        if (typeof login == 'string') {
            billData.success = false
            billData.status = 'LOGIN_FAILED'
            billData.message = login
            return billData
        }
        
        await page.goto('https://vco.ctamedicas.com/app/radicaciones')
        billData = await radicacionFlow(page, billData)        
    }

    billData = await coosaludService.sftpUpload(billData)
    return billData
}

export default CooSaludBot