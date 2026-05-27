import fs from 'fs'
import AdmZip from 'adm-zip'
import { PDFParse } from 'pdf-parse'
import { Page } from 'playwright'
import { getFileType } from '@/utils/string'
import { BillStatusType } from '@/Bot/types'
import { formatError } from '@/Bot/utils'

class BillFlow {
    public success: boolean
    public status: BillStatusType
    public message: string

    constructor(
        private page: Page,
        private bill: string
    ) {
        this.success = false
        this.status = null
        this.message = ''
    }

    async downloadFiles() {
        const bill = this.bill
        try {
            //* Section
            // Section 'Salud'
            await this.page.click('.app_item[title="Salud"]')
            // Dropdown 'Facturacion'
            await this.page.click('.dropdown-toggle[title="Facturacion"]')
            // Item 'Facturas'        
            await this.page.click('.dropdown-item[data-section="946"]')
            await this.page.getByText('Facturas de Venta').waitFor({ state: 'visible' })
            // Search
            const searchBox = this.page.locator('.o_searchview_input[role="searchbox"]')
            await searchBox.click()
            await searchBox.fill(bill)
            await searchBox.press('Enter')
            const searchResult = this.page.locator(`.o_list_table tbody tr td[data-tooltip="${bill}"]`)
            // Bill not found: return        
            const existsBill = await searchResult.waitFor({ state: 'visible' }).then(() => true).catch(() => false)
            if (!existsBill) {
                this.success = false
                this.status = 'ERROR'
                this.message = 'Factura no encontrada'
                return
            }
            // Open Result
            await searchResult.click()

            // Wait download
            const [download] = await Promise.all([
                this.page.waitForEvent('download'),
                this.page.locator('.o_AttachmentCard_asideItemDownload').click()
            ])
            //* Zip            
            const downloadPath = await download.path()
            const downloadBuffer = fs.readFileSync(downloadPath)
            return downloadBuffer
        } catch (err: any) {
            this.success = false
            this.status = 'ERROR'
            this.message = `Error al descargar factura: ${formatError(err.message)}`
            return
        }
    }

    async getFiles(zipBuffer: Buffer<ArrayBufferLike>) {
        const bill = this.bill
        try {
            const billZipFile = new AdmZip(zipBuffer).getEntries()
            const billFiles = []

            for (const file of billZipFile) {
                let fileCode: 'FEV' | 'XML' = 'FEV'
                let fileName: string = ''
                const fileType = getFileType(file.entryName)

                if (fileType == 'json') continue

                if (fileType == 'pdf') {
                    fileCode = 'FEV'
                    fileName = `FEV_901011395_${bill}.pdf`
                }

                if (fileType == 'xml') {
                    fileCode = 'XML'
                    fileName = `${bill}.xml`
                }

                billFiles.push({
                    code: fileCode,
                    name: fileName,
                    buffer: file.getData()
                })
            }

            return billFiles
        } catch (err: any) {
            this.success = false
            this.status = 'ERROR'
            this.message = `Error al descomprimir archivos de la factura: ${formatError(err.message)}`
            return
        }
    }

    async getContract(pdfFileBuffer: Buffer<ArrayBufferLike>) {
        try {
            const pdfParser = new PDFParse({ data: pdfFileBuffer })
            const pdfText = (await pdfParser.getText()).text

            const normalized = pdfText.replace(/\s+/g, ' ')
            const match = normalized.match(/TIPO USUARIO (Subsidiado|Contributivo)\b/i)
            if (!match?.[1]) {
                this.success = false
                this.status = 'CONTRACT_NOT_FOUND'
                this.message = 'Contrato no encontrado'
                return
            }
            let contract = match?.[1] as 'Contributivo' | 'Subsidiado'
            return contract
        } catch (err: any) {
            this.success = false
            this.status = 'ERROR'
            this.message = `Error al obtener el contrato: ${formatError(err.message)}`
            return
        }
    }
}

export default BillFlow