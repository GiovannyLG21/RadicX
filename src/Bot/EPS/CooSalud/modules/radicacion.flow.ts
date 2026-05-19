import { Page } from 'playwright'
import { CONTRACTS } from '../config/config'
import { delay, formatError } from '@/Bot/utils'
import { BillDataType, BillStatusType } from '@/Bot/types'

class RadicacionPage {
    success: boolean
    status: BillStatusType
    message: string

    constructor(
        private page: Page
    ) {
        this.success = false
        this.status = 'ERROR'
        this.message = ''
    }

    async createRadicacion(contract: 'Contributivo' | 'Subsidiado') {
        try {
            const contractCode = CONTRACTS[contract]
            // Button 'Crear Radicacion Auto'
            await this.page.locator('.btn.btn-success[aria-controls="tablaRadicaciones"]').click()
            // Set Options
            await this.page.locator('#typeRadAuto').selectOption('Res 2275 de 2023 (JSON)')
            await this.page.locator('#typeContraAuto').selectOption('PAQUETE')
            await this.page.locator('#numContraAuto').selectOption(contractCode)
            await this.page.locator('#typeServAuto').selectOption('PRO_POS')
            // Button 'Crear radicacion'
            await this.page.locator('#btCreateRadIps').click()
            // Await confirmation and reload
            await delay(1000)
            await this.page.reload()

            return 'Radicacion created'
        } catch (err: any) {
            this.success = false
            this.status = 'CREATE_RADICACION_FAILED'
            this.message = `Error al crear la radicacion: ${formatError(err.message)}`
            return
        }
    }

    async getRadicacionCode() {
        try {
            // Set 'Mostrar' in 'Todos'
            await this.page.locator('[name="tablaRadicaciones_length"]').selectOption('-1')
            // Table rows
            const radicaciones = this.page.locator('#tablaRadicaciones tbody tr')
            const createdRadicacion = radicaciones.last()
            const codeRadication = await createdRadicacion.locator('td').nth(3).textContent() as string

            return codeRadication.trim()
        } catch (err: any) {
            this.success = false
            this.status = 'GET_RADICACION_FAILED'
            this.message = `Error al obtener la radicacion: ${formatError(err.message)}`
            return
        }
    }

    failBill(billData: BillDataType) {
        billData.success = this.success
        billData.status = this.status
        billData.message = this.message
        return billData
    }
}

async function radicacionFlow(page: Page, billData: BillDataType) {
    const radicacionPage = new RadicacionPage(page)
    if (!billData.contract) {
        billData.success = false
        billData.status = 'CONTRACT_NOT_FOUND'
        billData.message = 'Contrato no encontrado'
        return billData
    }

    const createRadicacion = await radicacionPage.createRadicacion(billData.contract)
    if (!createRadicacion) return radicacionPage.failBill(billData)

    const radicacionCode = await radicacionPage.getRadicacionCode()
    if (!radicacionCode) return radicacionPage.failBill(billData)

    billData.radicado = radicacionCode
    return billData
}

export default radicacionFlow