import { BillFilesType, RadicacionCodesType } from '@/modules/Bot/bot.types'
import { delay } from '@/modules/Bot/bot.utils'
import { CONTRACTS } from '@/modules/Bot/Horisoes/config/config'
import { Page } from 'playwright'

class RadicacionPage {

    constructor(
        private page: Page
    ) { }

    async createRadicacion(contract: 'Contributivo' | 'Subsidiado') {
        const contractCode = CONTRACTS[contract]

        // Button 'Crear Radicacion Auto'
        await this.page.locator('.btn.btn-success[aria-controls="tablaRadicaciones"]').click()
        // Set Options
        await this.page.locator('#typeRadAuto').selectOption('Res 2275 de 2023 (JSON)')
        await this.page.locator('#typeContraAuto').selectOption('PAQUETE')
        await this.page.locator('#numContraAuto').selectOption(contractCode)
        await this.page.locator('#typeServAuto').selectOption('PRO_POS')
        // Button 'Crear radicacion'
        // await this.page.locator('#btCreateRadIps').click()
        // Await confirmation and reload
        await delay(1000)
        await this.page.reload()
    }

    async getRadicacionCode() {
        // Set 'Mostrar' in 'Todos'
        await this.page.locator('[name="tablaRadicaciones_length"]').selectOption('-1')
        // Table rows
        const radicaciones = this.page.locator('#tablaRadicaciones tbody tr')
        const numRadicaciones = await radicaciones.count()
        // 'Radicacion' Created
        const createdRadicacion = radicaciones.nth(numRadicaciones - 1)
        const codeRadication = await createdRadicacion.locator('td').nth(3).textContent() as string

        return codeRadication.trim()
    }

    getContracts(billsFiles: BillFilesType[]): { contract: 'Contributivo' | 'Subsidiado', exists: boolean }[] {
        return [{
            contract: 'Contributivo',
            exists: billsFiles.some(
                bill => bill.contract === 'Contributivo'
            )
        },
        {
            contract: 'Subsidiado',
            exists: billsFiles.some(
                bill => bill.contract === 'Subsidiado'
            )
        }]
    }
}

async function radicacionFlow(page: Page, billsFiles: BillFilesType[]) {
    const radicacionPage = new RadicacionPage(page)        
    const contracts = radicacionPage.getContracts(billsFiles)
    const radicacionCodes: RadicacionCodesType = []

    for (const contract of contracts) {
        if (!contract.exists) continue
        await radicacionPage.createRadicacion(contract.contract)
        const radicacionCode = await radicacionPage.getRadicacionCode()
        radicacionCodes.push({
            contract: contract.contract,
            code: radicacionCode
        })
    }

    return radicacionCodes
}

export default radicacionFlow