import fs from 'fs'
import AdmZip from 'adm-zip'
import { Page } from 'playwright'
import { delay, getFileType } from '../../bot.utils'
import { BillFilesType } from '../../bot.types'

class BillPage {

    constructor(
        private page: Page
    ) { }

    async downloadFiles(bill: string) {

        //* Section
        // Section 'Salud'
        await this.page.click('.app_item[title="Salud"]')
        // Dropdown 'Facturacion'
        await this.page.click('.dropdown-toggle[title="Facturacion"]')
        // Item 'Facturas'
        await this.page.click('.dropdown-item[data-section="946"]')
        await delay(1000)
        // Search
        const searchBox = this.page.locator('input.o_searchview_input[role="searchbox"]')
        await searchBox.click()
        await searchBox.fill(bill)
        await searchBox.press('Enter')
        await delay(500)
        const searchResult = this.page.locator('.o_list_table tbody .o_data_row')
        // Bill not found: return
        const searchResultCount = await searchResult.count()
        if (searchResultCount == 0) return
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
        const billFiles: BillFilesType = {
            bill,
            files: []
        }
        for (const file of billZipFile) {
            let fileCode: 'FEV' | 'XML' = 'FEV'
            let fileName = ''
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

            billFiles.files.push({
                code: fileCode,
                name: fileName,
                buffer: file.getData()
            })
        }
        return billFiles
    }
}

async function BillFlow(page: Page, bills: string[]) {
    const billPage = new BillPage(page)
    const billFiles: BillFilesType[] = []

    for (const bill of bills) {
        const zipBuffer = await billPage.downloadFiles(bill)
        if (!zipBuffer) continue
        const files = await billPage.getFiles(zipBuffer, bill)
        billFiles.push(files)
    }

    return billFiles
}

export default BillFlow