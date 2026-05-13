import fs from 'fs'
import AdmZip from 'adm-zip'
import { PDFParse } from 'pdf-parse'
import { Page } from 'playwright'
import { getFileType } from '../../bot.utils'
import { BillFilesType, MessageType, StatusType } from '../../bot.types'

class BillPage {
    success: boolean
    status: StatusType
    message: MessageType

    constructor(
        private page: Page
    ) {
        this.success = true
        this.status = 'NOT_FOUND'
        this.message = 'Factura no encontrada'
    }

    async downloadFiles(bill: string) {
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
            timeout: 2000
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
    }

    async getFiles(zipBuffer: NonSharedBuffer, bill: string) {
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
    }

    async getContract(pdfFileBuffer: Buffer<ArrayBufferLike>) {
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
    }
}

async function BillFlow(page: Page, bills: string[]) {
    const billPage = new BillPage(page)
    const billsFiles: BillFilesType[] = []

    for (const bill of bills) {
        //Files        
        const zipBuffer = await billPage.downloadFiles(bill)
        if (!zipBuffer) {
            billsFiles.push({
                bill,
                contract: null,
                success: billPage.success,
                status: billPage.status,
                message: billPage.message,
                files: []
            })
            continue
        }
        const billFiles = await billPage.getFiles(zipBuffer, bill)
        // Get Contract
        const FEVFileBuffer = billFiles.find(file => file.code == 'FEV')!.buffer
        const billContract = await billPage.getContract(FEVFileBuffer)
        if (!billContract) {
            billsFiles.push({
                bill,
                contract: null,
                success: billPage.success,
                status: billPage.status,
                message: billPage.message,
                files: billFiles
            })
            continue
        }
        //Save        
        billsFiles.push({
            bill,
            contract: billContract,
            success: true,
            status: 'SUCCESS',
            message: 'Factura descargada',
            files: billFiles
        })
    }

    return billsFiles
}

export default BillFlow