import fs from 'fs'
import AdmZip from 'adm-zip'
import { PDFParse } from 'pdf-parse'
import { Page } from 'playwright'
import { getFileType } from '@/utils/string'
import { BillDataType, BillStatusType } from '@/Bot/types'

class BillPage {
    success: boolean
    status: BillStatusType
    message: string

    constructor(
        private page: Page
    ) {
        this.success = false
        this.status = null
        this.message = ''
    }

    async downloadFiles(bill: string) {
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
            const existsBill = await searchResult.waitFor({
                state: 'visible',
                timeout: 5000
            }).then(() => true).catch(() => false)
            if (!existsBill) {
                this.success = false
                this.status = 'NOT_FOUND'
                this.message = 'Factura no encontrada'
                return
            }
            // Open Result
            await searchResult.click()

            // Wait download
            const downloadPromise = this.page.waitForEvent('download')
            await this.page.locator('.o_AttachmentCard_asideItemDownload').click()
            //* Zip
            const download = await downloadPromise
            const downloadPath = await download.path()
            const downloadBuffer = fs.readFileSync(downloadPath)
            return downloadBuffer
        } catch (err: any) {
            this.success = false
            this.status = 'ERROR'
            this.message = err.message
            return
        }
    }

    async getFiles(zipBuffer: NonSharedBuffer, bill: string) {
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
            this.message = err.message
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
            this.message = err.message
            return
        }
    }

    failedBill(bill: string) {
        return {
            bill,
            contract: null,
            success: this.success,
            status: this.status,
            message: this.message,
            files: []
        }
    }
}

async function BillFlow(page: Page, bill: string) {
    const billPage = new BillPage(page)

    const zipBuffer = await billPage.downloadFiles(bill)
    if (!zipBuffer) return billPage.failedBill(bill)

    const billFiles = await billPage.getFiles(zipBuffer, bill)
    if (!billFiles) return billPage.failedBill(bill)

    const FEVFileBuffer = billFiles.find(file => file.code == 'FEV')!.buffer
    const billContract = await billPage.getContract(FEVFileBuffer)
    if (!billContract) return billPage.failedBill(bill)

    const billData: BillDataType = {
        bill,
        contract: billContract,
        success: true,
        status: 'SUCCESS',
        message: 'Factura descargada',
        files: billFiles
    }

    return billData
}

export default BillFlow