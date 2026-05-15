import { Page } from 'playwright'
import { BillFilesType } from '@/modules/Bot/bot.types'
import { delay, formatDate } from '../../bot.utils'
import fs from 'fs'
import AdmZip from 'adm-zip'

class RIPSPage {

    constructor(
        private page: Page,
    ) { }

    async downloadFiles(bill: string): Promise<{ code: 'RIPS' | 'CUV', buffer: NonSharedBuffer }[]> {
        const actualDate = formatDate(new Date())
        //* Section
        // Dropdown 'Facturacion'
        await this.page.click('.dropdown-toggle[title="Facturacion"]')
        // Item 'Exportar Rips'        
        await this.page.click('.dropdown-item[data-section="1279"]')
        // Input 'Cliente'
        await this.page.locator('#partner_id.o-autocomplete--input').fill('900226715')
        // Option 'Coosalud'
        await this.page.locator('ul.o-autocomplete--dropdown-menu li a', {
            hasText: '[900226715] COOSALUD ENTIDAD PROMOTORA DE SALUD S.A'
        }).click()
        // Uncheck 'Incluir XML'
        await this.page.locator('input#include_xml').setChecked(false)
        // Input 'Fecha desde' & 'Fecha hasta'
        await this.page.fill('input#date_from', '01-01-2010')
        await this.page.fill('input#date_to', actualDate)

        //* Button 'Exportar'
        const exportButton = this.page.locator('button[name="button_export_data"]')
        //* Button 'RIPS'
        const downloadButton = this.page.locator('div[name="rips_file"] a')

        //* CUV
        // Check 'Radicacion'
        await this.page.getByLabel('Radicación').click()
        // Table option 'Añadir una linea'
        await this.page.getByText('Añadir una línea').click()
        // Search and select bill in 'modal'
        const modal = this.page.locator('.modal-dialog')
        const searchInput = modal.locator('.o_searchview_input')
        await searchInput.fill(bill)
        await searchInput.press('Enter')
        // Select search result
        const searchResult = modal.locator(`.o_list_table tbody tr td[data-tooltip="${bill}"]`)
        await searchResult.waitFor({
            state: 'visible'
        })
        await searchResult.click()
        // Export
        await exportButton.click()
        // Wait download
        await downloadButton.waitFor()
        const downloadCUVPromise = this.page.waitForEvent('download')
        await downloadButton.click()
        //* Zip
        const CUVDownload = await downloadCUVPromise
        const CUVDownloadPath = await CUVDownload.path()
        const CUVZipBuffer = fs.readFileSync(CUVDownloadPath)

        //* RIPS                                                          
        // Select 'RIPS'
        await this.page.getByLabel('RIPS').click()
        // Check 'Exclude Encabezado'
        await this.page.locator('input#exclude_rips_header').setChecked(true)
        // Clean download button
        await downloadButton.evaluate(element => element.remove())
        // Export
        await exportButton.click()
        // Wait download
        await downloadButton.waitFor()
        const downloadRIPSPromise = this.page.waitForEvent('download')
        await downloadButton.click()
        //* Zip
        const RIPSDownload = await downloadRIPSPromise
        const RIPSDownloadPath = await RIPSDownload.path()
        const RIPSZipBuffer = fs.readFileSync(RIPSDownloadPath)

        // Close 'Exportar Rips' 
        await this.page.locator('.modal-header button[aria-label="Close"]').click()

        return [
            {
                code: 'CUV',
                buffer: CUVZipBuffer,
            },
            {
                code: 'RIPS',
                buffer: RIPSZipBuffer
            }
        ]
    }

    async getFiles(zipBufferFiles: { code: 'RIPS' | 'CUV', buffer: NonSharedBuffer }[], bill: string) {
        return zipBufferFiles.map(entry => {
            const file = new AdmZip(entry.buffer).getEntries()[0]!
            let fileName = file.entryName
            const fileCode = entry.code

            if (fileCode == 'CUV') {
                fileName = `CUV_${bill}.json`
            }

            return {
                code: fileCode,
                name: fileName,
                buffer: file.getData()
            }
        })
    }
}

async function RIPSFlow(page: Page, billsFiles: BillFilesType[]) {
    const ripsPage = new RIPSPage(page)

    for (const entry of billsFiles) {
        if (!entry.success) continue
        const bill = entry.bill
        const zipBufferFiles = await ripsPage.downloadFiles(bill)
        const RIPSFiles = await ripsPage.getFiles(zipBufferFiles, bill)
        for (const file of RIPSFiles) entry.files.push(file)
        entry.message = 'Factura & RIPS descargados'
    }

    return billsFiles
}

export default RIPSFlow