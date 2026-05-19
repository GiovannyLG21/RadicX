import fs from 'fs'
import AdmZip from 'adm-zip'
import { Page } from 'playwright'
import { BillDataType, BillStatusType } from '@/Bot/types'
import { formatDate } from '@/utils/dates'
import { formatError } from '@/Bot/utils'

class RIPSPage {
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

    async downloadFiles(bill: string): Promise<{ code: 'RIPS' | 'CUV', buffer: NonSharedBuffer }[] | undefined> {
        try {
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
            await downloadButton.waitFor()

            // Wait download
            const [CUVDownload] = await Promise.all([
                this.page.waitForEvent('download'),
                downloadButton.click()
            ])

            //* Zip            
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
            await downloadButton.waitFor()
            // Wait download
            const [RIPSDownload] = await Promise.all([
                this.page.waitForEvent('download'),
                downloadButton.click()
            ])
            //* Zip            
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

        } catch (err: any) {
            this.success = false
            this.status = 'ERROR'
            this.message = `Error al descargar RIPS: ${formatError(err.message)}`
            return
        }
    }

    async getFiles(zipBufferFiles: { code: 'RIPS' | 'CUV', buffer: NonSharedBuffer }[], bill: string) {
        try {
            const billFiles = []
            for (const entry of zipBufferFiles) {
                const file = new AdmZip(entry.buffer).getEntries()[0]!
                let fileName = file.entryName
                const fileCode = entry.code

                if (fileCode == 'CUV') {
                    fileName = `CUV_${bill}.json`
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
            this.message = `Error al descomprimir RIPS: ${formatError(err.message)}`
            return
        }
    }

    failedBill(bill: BillDataType) {
        bill.success = this.success
        bill.status = this.status
        bill.message = this.message
        return bill
    }
}

async function RIPSFlow(page: Page, billData: BillDataType) {
    if (!billData.success) return billData
    const ripsPage = new RIPSPage(page)
    const bill = billData.bill

    const zipBufferFiles = await ripsPage.downloadFiles(bill)
    if (!zipBufferFiles) return ripsPage.failedBill(billData)

    const RIPSFiles = await ripsPage.getFiles(zipBufferFiles, bill)
    if (!RIPSFiles) return ripsPage.failedBill(billData)

    for (const file of RIPSFiles) billData.files.push(file)
    billData.message = 'Factura & RIPS descargados'

    return billData
}

export default RIPSFlow