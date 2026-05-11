import { Page } from 'playwright'
import { BillFilesType } from '@/modules/Bot/bot.types'
import { delay, formatDate } from '../../bot.utils'
import fs from 'fs'
import AdmZip from 'adm-zip'

export class RIPSPage {

    constructor(
        private page: Page,
    ) { }

    async downloadFiles(bill: string) {
        const actualDate = formatDate(new Date())

        //* Section
        // Salud Section
        await this.page.click('.app_item[title="Salud"]')
        // Dropdown 'Facturacion'
        await this.page.click('.dropdown-toggle[title="Facturacion"]')
        // Item 'Exportar Rips'
        await this.page.click('.dropdown-item[data-section="1279"]')
        // Input 'Cliente'
        await this.page.fill('.o-autocomplete--input', '900226715')
        // Option 'Coosalud'
        await this.page.click('.o-autocomplete--dropdown-menu a')
        // Uncheck 'Incluir XML'
        await this.page.locator('input#include_xml').setChecked(false)
        // Input 'Fecha desde' & 'Fecha hasta'
        await this.page.fill('input#date_from', '01-01-2010')
        await this.page.fill('input#date_to', actualDate)
        // Button 'Exportar'
        const exportButton = this.page.locator('button[name="button_export_data"]')
        // Button 'RIPS'
        const downloadButton = this.page.locator('div[name="rips_file"] a')

        //* CUV
        // Check 'Radicacion'
        await this.page.getByLabel('Radicación').click()
        // Table option 'Añadir una linea'
        await this.page.getByText('Añadir una línea').click()
        // Search and select bill in 'modal'
        const modal = this.page.locator('.modal-dialog')
        await modal.locator('.o_searchview_input').fill(bill)
        await modal.locator('.o_searchview_input').press('Enter')
        await delay(500)
        // Select search result
        await modal.locator('.o_list_table tbody .o_data_row').click()
        // Export
        await exportButton.click()
        await delay(1000)
        // Wait download
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
        // Export and wait
        await exportButton.click()
        await delay(1000)
        // Wait download
        const downloadRIPSPromise = this.page.waitForEvent('download')
        await downloadButton.click()
        //* Zip
        const RIPSDownload = await downloadRIPSPromise
        const RIPSDownloadPath = await RIPSDownload.path()
        const RIPSZipBuffer = fs.readFileSync(RIPSDownloadPath)

        return [
            {
                name: 'CUV',
                buffer: CUVZipBuffer,
            },
            {
                name: 'RIPS',
                buffer: RIPSZipBuffer
            }
        ]
    }

    async getFiles(zipBufferFiles: { name: string, buffer: NonSharedBuffer }[], bill: string) {
        return zipBufferFiles.map(entry => {
            const file = new AdmZip(entry.buffer).getEntries()[0]!
            let fileName = file.entryName
            let fileCode: 'RIPS' | 'CUV' = 'RIPS'
            if (entry.name == 'CUV') {
                fileCode = 'CUV'
                fileName = `${bill}_CUV.json`
            }
            return {
                code: fileCode,
                name: fileName,
                buffer: file.getData()
            }
        })
    }
}

export async function RIPSFlow(page: Page, billsFiles: BillFilesType[]) {
    const ripsPage = new RIPSPage(page)

    for (const entry of billsFiles) {
        const bill = entry.bill
        const zipBufferFiles = await ripsPage.downloadFiles(bill)
        const RIPSFiles = await ripsPage.getFiles(zipBufferFiles, bill)
        for (const file of RIPSFiles) entry.files.push(file)
    }

    return billsFiles
}