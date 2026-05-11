import { delay } from '@/modules/Bot/bot.utils'
import { Page } from 'playwright'

class RadicacionPage {

    constructor(
        private page: Page
    ) { }

    async createRadicacion() {
        // Button 'Crear Radicacion Auto'
        await this.page.locator('.btn.btn-success[aria-controls="tablaRadicaciones"]').click()
        // Set Options
        await this.page.locator('#typeRadAuto').selectOption('Res 2275 de 2023 (JSON)')
        await this.page.locator('#typeContraAuto').selectOption('PAQUETE')
        await this.page.locator('#numContraAuto').selectOption('NAL00C47051567-25')
        await this.page.locator('#typeServAuto').selectOption('PRO_POS')
        // Button 'Crear radicacion'
        await this.page.locator('#btCreateRadIps').click()
        // Await confirmation and reload
        await delay(2000)
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
}

async function radicacionFlow(page: Page) {
    const radicacionPage = new RadicacionPage(page)

    await radicacionPage.createRadicacion()
    const radicacionCode = await radicacionPage.getRadicacionCode()

    return radicacionCode
}

export default radicacionFlow