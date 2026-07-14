import fs from 'fs'
import path from 'path'
import { EXCEL_FILE_ID, RADICADOS_FOLDER_ID } from '../IPS/Horisoes/config/config'
import { BrowserContext, Page } from 'playwright'
import { execPlaywright, newContext } from '../config/browser'
import CooSaludBot from '../EPS/CooSalud'
import HorisoesBot from '../IPS/Horisoes'
import { sheets } from '../config/googleapis'
import { HorisoesCoosaludFlow } from '../config/flows'
import { HorisoesCoosaludQueue } from '../config/queues'
import { CreateExecutionReturnType } from '@/modules/Execution/execution.types'
import { googleapis } from '@/Bot/utils'
import { getFileType } from '@/utils/string'
import { BillDataType, BillServicesType, ExcelRowData, FlowChildJobType, HorisoesCoosaludMetadataType, RadicacionCodesType } from '../types'
import * as executionService from '@/modules/Execution/execution.service'
import { NODE_ENV } from '@/config/env'
const TEST = NODE_ENV === 'development' && true

/**
 * @class **Iniciador** de un workflow para la creacion de un Flow y sus Jobs. 
 * @method **run:** Creacion de Jobs e inicializacion del flow     
 */
export class HorisoesCoosaludInitiator {
    private ipsCode: string

    private epsCode: string

    /**
     * @param {CreateExecutionReturnType} execution Datos de la ejecucion creada por el workflow.
     */
    public execution: CreateExecutionReturnType | undefined

    /**
     * Variable de estado del bot
     * @param {boolean} success Estado de los metodos ejecutados     
     */
    public success: boolean

    /**
     * Variable de codigo de estado http del bot
     * @param {boolean} status Codigo de estado http de la ejecucion
     */
    public status: number

    /**
     * Variable de estado del bot
     * @param {string} message Mensaje de los metodos ejecutados     
     */
    public message: string

    /**
     * @param {number} maxJobs Maximo de jobs simultaneos que tolerara la cola del workflow.
     */
    private maxJobs: number

    constructor(
        private bills: string[],
        private service: BillServicesType
    ) {
        this.ipsCode = '901749264'
        this.epsCode = 'EPS042'
        this.success = true
        this.status = 200
        this.message = ''
        this.maxJobs = 4000
    }

    /**
     * Metodo para la **verificacion del estado de los servicios** del workflow.
     * @param {BrowserContext} context Contexto del browser      
     */
    static async servicesHealthCheck(context: BrowserContext): Promise<{ success: boolean, message: string }> {

        const setError = (message: string) => ({
            success: false,
            message
        })

        const page = await context.newPage()

        const EPSServices = new CooSaludBot(context, page)
        const EPSServicesStatus = await EPSServices.servicesStatus()
        if (!EPSServicesStatus) return setError(EPSServices.message)

        const IPSServices = new HorisoesBot(context, page, '', '')
        const IPSServicesStatus = await IPSServices.servicesStatus()
        if (!IPSServicesStatus) return setError(IPSServices.message)

        await page.close()

        return {
            success: true,
            message: 'SUCCESS'
        }
    }

    /**
     * Verificacion de Jobs en estado **waiting** y Jobs **entrantes**.
     * 
     * Este metodo evita la insercion de nuevos Jobs si es superada la cuota maxima definida en **maxJobs**.
     */
    private async availableSpace() {
        const waitingJobs = await HorisoesCoosaludQueue.getWaitingCount()
        const maxCovered = waitingJobs + this.bills.length > this.maxJobs
        if (maxCovered) {
            this.success = false
            this.status = 409
            this.message = `Esta intentando añadir ${this.bills.length} facturas a una cola con ${waitingJobs} en proceso. El maximo de facturas en proceso es de ${this.maxJobs}.`
            return false
        }
        return true
    }

    /**
     * Metodo para la **creacion de pre-radicados** haciendo uso del **EPS Bot**. 
     * 
     * Estos son pasados como parametro a cada Job.     
     */
    private async createRadicados(context: BrowserContext) {

        if (TEST) {
            const radicacionCodes: RadicacionCodesType = [
                { code: '525921_20260602_193846', contract: 'Contributivo' },
                { code: '525920_20260602_193844', contract: 'Subsidiado' }
            ]
            // Create drive folders
            for (const { code } of radicacionCodes) await googleapis.drive.createDriveFolder(RADICADOS_FOLDER_ID, code)
            return radicacionCodes
        }

        const EPSBot = new CooSaludBot(context, await context.newPage())
        const radicacionCodes = await EPSBot.createRadicados()
        if (!radicacionCodes) {
            this.success = EPSBot.success
            this.status = 500
            this.message = EPSBot.message
            return
        }

        // Create drive folders
        for (const { code } of radicacionCodes) await googleapis.drive.createDriveFolder(RADICADOS_FOLDER_ID, code)

        return radicacionCodes
    }

    /**
     * Metodo para la creacion de una **ejecución**.     
     */
    private async createExecution() {
        if (TEST) return
        const execution = await executionService.createExecution({ ipsCode: this.ipsCode, epsCode: this.epsCode })
        this.execution = execution
        return execution
    }

    /**
     * Creacion de Jobs apartir de las facturas proporcionadas     
     * @param {CreateExecutionReturnType} execution Datos de la ejecucion creada
     * @param {RadicacionCodesType} radicacionCodes Datos de los codigos de radicados
     */
    private createJobs(execution: CreateExecutionReturnType | undefined, service: BillServicesType, radicacionCodes: RadicacionCodesType) {
        const Jobs: FlowChildJobType[] = this.bills.map((bill, index) => ({
            name: `horisoes_coosalud_bill_${bill}`,
            queueName: 'horisoes_coosalud_queue',
            data: {
                executionId: execution?.id,
                flow: `horisoes_coosalud_flow_${execution?.id}`,
                service,
                radicacionCodes,
                bill,
            },
            opts: {
                jobId: `${index + 1}_horisoes_coosalud_${bill}_${execution?.id}`,
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 3000
                },
                ignoreDependencyOnFailure: true,
                removeOnComplete: false,
                removeOnFail: false
            }
        }))

        return Jobs
    }

    /**
     * **Creacion e inicializacion de Flow y Jobs.**
     */
    async run() {
        const browser = await execPlaywright()
        const context = await newContext(browser)

        const serviceStatus = await HorisoesCoosaludInitiator.servicesHealthCheck(context)
        if (!serviceStatus.success) {
            this.status = 500
            this.success = false
            this.message = serviceStatus.message ?? ''
            return
        }

        const availableSpace = await this.availableSpace()
        if (!availableSpace) return

        const radicacionCodes = await this.createRadicados(context)
        if (!radicacionCodes) return

        const execution = await this.createExecution()

        const Jobs = this.createJobs(execution, this.service, radicacionCodes)

        await HorisoesCoosaludFlow.add({
            name: `horisoes_coosalud_flow_${execution?.id}`,
            data: {
                executionId: execution?.id,
                service: this.service,
                radicacionCodes: radicacionCodes,
                bills_cant: this.bills.length,
                bills: this.bills
            },
            queueName: 'horisoes_coosalud_flow',
            children: Jobs,
            opts: {
                attempts: 5,
                backoff: {
                    type: 'fixed',
                    delay: 60000
                }
            }
        })

        await browser.close()
    }
}

/**
 * @class **Workflow** para el manejo de cada factura, usado directa y exclusivamente por el worker correspondiente.
 */
export class HorisoesCoosaludWorkflow {

    /**
     * @class **Clase Bot** perteneciente a la **IPS Horisoes**.
     */
    private IPSBot: HorisoesBot

    /**
     * @class **Clase Bot** perteneciente a la **EPS CooSalud**.
     */
    private EPSBot: CooSaludBot

    /**
     * @param {BillDataType} billData Objeto con los datos y archivos de la factura procesada/por procesar.
     */
    public billData: BillDataType

    constructor(
        private context: BrowserContext,
        private page: Page,
        private service: BillServicesType,
        private radicacionCodes: RadicacionCodesType,
        private bill: string
    ) {
        this.IPSBot = new HorisoesBot(this.context, this.page, this.service, this.bill)
        this.EPSBot = new CooSaludBot(this.context, this.page)
        this.billData = this.IPSBot.billData
    }

    async run() {
        // Get service
        const availableServices = HorisoesBot.availableServices
        const selectedService = availableServices[this.service]
        const billService = this.IPSBot.services[selectedService as keyof typeof this.IPSBot.services]

        // Get files
        await this.IPSBot.getBillFiles()
        await this.IPSBot.getRipsFiles()
        await billService()

        const billData = this.IPSBot.billData

        // Set preradicado
        const radicadoCode = this.radicacionCodes.find(radicado => radicado.contract == billData.contract)?.code
        if (radicadoCode) billData.radicado = radicadoCode

        // Upload bill
        if (!TEST) await this.EPSBot.uploadBill(billData)

        // Upload bill to google drive
        await HorisoesCoosaludServices.uploadDriveBill(billData)

        this.billData = billData
        return billData
    }
}

/**
 * @class Servicios del **Workflow** usados directamente por un worker.
 */
export class HorisoesCoosaludServices {
    private ipsCode: string

    private epsCode: string

    /**
     * Variable de estado del bot
     * @param {boolean} success Estado de los metodos ejecutados     
     */
    public success: boolean

    /**
     * Variable de estado del bot
     * @param {string} message Mensaje de los metodos ejecutados     
     */
    public message: string

    constructor() {
        this.ipsCode = '901749264'
        this.epsCode = 'EPS042'
        this.success = true
        this.message = ''
    }

    async servicesHealthCheck(context: BrowserContext) {
        return await HorisoesCoosaludInitiator.servicesHealthCheck(context)
    }

    EPSServices(context: BrowserContext, page: Page) {
        return new CooSaludBot(context, page)
    }

    /**
    * Metodo para obtener todos los preradicados creados en la plataforma de la EPS.
    */
    async getPreRadicadosCreated() {
        const executions = await executionService.getLastExecutions(this.ipsCode, this.epsCode)
        return [...new Set(
            executions.map(execution => {
                const metadata = execution.metadata as unknown as HorisoesCoosaludMetadataType
                return metadata.pre_radicados.map(pre_radicado => pre_radicado.codigo)
            }).flat(1)
        )]
    }

    /**
     * Metodo para obtener las facturas de un preradicado.
     * @param code Preradicado que contiene las facturas
     */
    async getPreRadicadoBills(code: string) {
        const executions = await executionService.getExecutions(this.ipsCode, this.epsCode)
        const bills = executions.map(execution => {
            const metadata = execution.metadata as unknown as HorisoesCoosaludMetadataType
            const bills = metadata.pre_radicados.find(pre_radicado => pre_radicado.codigo === code)?.facturas
            return bills ?? []
        }).flat(1)

        return bills
    }

    /**
     * Metodo para actualizar el archivo excel (archivo de seguimiento en drive) insertando un nuevo preradicado.
     * @param {ExcelRowData} data Array con datos del preradicado.
     */
    async insertPreRadicadoData(data: ExcelRowData) {
        try {
            await googleapis.sheets.insertValues(EXCEL_FILE_ID, 'Radicados', 'A:I', data)
            return true
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.success = false
                this.message = `Error al insertar fila en archivo pre-radicados: ${err.message}`
                return false
            }
        }
    }

    /**
     * Metodo para actualizar el archivo excel (archivo de seguimiento en drive) insertando informacion nueva de los preradicados.
     * 
     * **Nota:** Este metodo tambien elimina la carpeta de Google Drive de un preradicado si esta devolvio error.
     * @param data Valores de filas excel con los datos de cada preradicado
     */
    async updatePreRadicadosFile(data: ExcelRowData[]) {
        try {
            const sheet = 'Radicados'
            let fileCodes = await googleapis.sheets.getValues(EXCEL_FILE_ID, 'Radicados', 'E:E')

            const preRadicadosData = []
            for (const preRadicado of data) {
                const date = preRadicado[7] as string
                const code = preRadicado[4] as string
                const radicado = preRadicado[10] as string
                let rowIndex = fileCodes.findIndex(row => row[0] === code)

                // Preradicado not found - insert
                if (rowIndex == -1) {
                    await googleapis.sheets.insertValues(EXCEL_FILE_ID, sheet, 'A:L', preRadicado)
                    fileCodes = await googleapis.sheets.getValues(EXCEL_FILE_ID, 'Radicados', 'E:E')
                    rowIndex = fileCodes.findIndex(row => row[0] === code)
                }

                // Update row
                const rowNumber = rowIndex + 1
                await googleapis.sheets.updateValues(EXCEL_FILE_ID, sheet, `A${rowNumber}:L${rowNumber}`, preRadicado)

                // Set row color if the status is 'error'
                if (!radicado) {
                    const range = {
                        startColumn: 0,
                        endColumn: 12,
                        startRow: rowIndex,
                        endRow: rowIndex + 1
                    }
                    await googleapis.sheets.styles.changeCellBgColor(EXCEL_FILE_ID, sheet, range, '255, 0, 0')
                    // Delete Google Drive folder
                    const preRadicadoFolder = (await googleapis.drive.getDriveFolder(RADICADOS_FOLDER_ID, code))?.id
                    if (preRadicadoFolder) await googleapis.drive.trashDriveFolder(preRadicadoFolder)
                    continue
                }

                // Set preradicado data
                preRadicadosData.push({ date, code, radicado })
            }

            return preRadicadosData
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.success = false
                this.message = `Error al actualizar archivo de seguimiento: ${err.message}`
                return
            }
        }
    }

    /**
     * Metodo para crear una hoja en el archivo excel (archivo de seguimiento en drive) con todas las facturas de los radicados 
     * proporcionados al invocar el metodo **updatePreRadicadosFile**.
     * @param preRadicadosData Datos de los radicados a procesar
     */
    async createRadicadosSheet(preRadicadosData: { date: string, code: string, radicado: string }[]) {
        try {
            const actualDate = new Date()
            const [day, month, year] = [
                String(actualDate.getDate()).padStart(2, '0'),
                String(actualDate.getMonth() + 1).padStart(2, '0'),
                String(actualDate.getFullYear()).slice(2)
            ]
            const sheetName = `Consolidado ${day}.${month}.${year}`

            // Verify sheet
            const existingSheet = await googleapis.sheets.existingSheet(EXCEL_FILE_ID, sheetName)
            if (existingSheet) return true

            // Data
            const fileData = []
            for (const preRadicado of preRadicadosData) {
                if (!preRadicado.date || !preRadicado.radicado) continue
                const bills = await this.getPreRadicadoBills(preRadicado.code)

                for (const bill of bills) {
                    const data = {
                        date: preRadicado.date,
                        bill,
                        eps: 'COOSALUD ENTIDAD PROMOTORA DE SALUD S.A',
                        modality: 'PAQUETE',
                        radicado: preRadicado.radicado,
                        user: 'HORIBOT'
                    }
                    fileData.push(Object.values(data))
                }
            }

            // Create sheet
            const newSheet = await googleapis.sheets.newSheet(EXCEL_FILE_ID, sheetName)
            const sheetId = newSheet.sheetId

            // Set header
            const sheetHeader = [
                "FECHA RADICACION",
                "FACTURA",
                "EPS",
                "MODALIDAD",
                "NUM RADICADO",
                "USUARIO"
            ]
            await googleapis.sheets.insertValues(EXCEL_FILE_ID, sheetName, 'A1:F1', sheetHeader)

            // Insert rows
            await googleapis.sheets.insertRows(EXCEL_FILE_ID, sheetName, 'A2:F', fileData)

            // Format sheet
            await this.formatRadicadosSheet(sheetId)

            return true
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.success = false
                this.message = `Error al crear consolidado de pre-radicados: ${err.message}`
            }
            return false
        }
    }

    /**
     * Metodo para aplicar el formato a una hoja de radicados (Consolidado).
     * @param sheetId Id de la hoja del archivo     
     */
    async formatRadicadosSheet(sheetId: number | null) {
        if (!sheetId) throw new Error('Sheet id no proporcionado')

        //? Columns width
        // widths = ["A: 150", "B: 150", "C: 350", "D: 150", "E: 250", "F: 150"]
        const widths = [150, 150, 350, 150, 250, 150]

        const requests = widths.map((width, index) => {
            return {
                updateDimensionProperties: {
                    range: {
                        sheetId,
                        dimension: 'COLUMNS',
                        startIndex: index,
                        endIndex: index + 1,
                    },
                    properties: {
                        pixelSize: width,
                    },
                    fields: 'pixelSize',
                }
            }
        })
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: EXCEL_FILE_ID,
            requestBody: {
                requests
            },
        })

        //? Column A - Date Format
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: EXCEL_FILE_ID,
            requestBody: {
                requests: [{
                    repeatCell: {
                        range: {
                            sheetId,
                            startRowIndex: 1, // Row 2
                            startColumnIndex: 0, // Column A
                            endColumnIndex: 1
                        },
                        cell: {
                            userEnteredFormat: { //Date format
                                horizontalAlignment: 'LEFT',
                                numberFormat: {
                                    type: 'DATE',
                                    pattern: 'dd/MM/yyyy',
                                }
                            }
                        },
                        fields: 'userEnteredFormat.horizontalAlignment,userEnteredFormat.numberFormat',
                    }
                }]
            }
        })

        //* Header row format
        //? Row height
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: EXCEL_FILE_ID,
            requestBody: {
                requests: [{
                    updateDimensionProperties: { //Row height
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: 0,
                            endIndex: 1,
                        },
                        properties: {
                            pixelSize: 40,
                        },
                        fields: 'pixelSize',
                    }
                }]
            }
        })

        //? Row format
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: EXCEL_FILE_ID,
            requestBody: {
                requests: [{
                    repeatCell: {
                        range: {
                            sheetId,
                            startRowIndex: 0,
                            endRowIndex: 1,
                            startColumnIndex: 0,
                            endColumnIndex: 6
                        },
                        cell: {
                            userEnteredFormat: {
                                verticalAlignment: 'MIDDLE',
                                backgroundColor: { //Background color
                                    red: 66 / 255,
                                    green: 133 / 255,
                                    blue: 244 / 255,
                                },
                                textFormat: { //Bold & text color
                                    bold: true,
                                    foregroundColor: {
                                        red: 1,
                                        green: 1,
                                        blue: 1,
                                    }
                                }
                            }
                        },
                        fields: 'userEnteredFormat.verticalAlignment,userEnteredFormat.backgroundColor,userEnteredFormat.textFormat',
                    }
                }]
            }
        })

        //? Row borders
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: EXCEL_FILE_ID,
            requestBody: {
                requests: [{
                    updateBorders: {
                        range: {
                            sheetId,
                            startRowIndex: 0,
                            endRowIndex: 1,
                            startColumnIndex: 0,
                            endColumnIndex: 6,
                        },
                        top: { style: 'SOLID' },
                        bottom: { style: 'SOLID' },
                        left: { style: 'SOLID' },
                        right: { style: 'SOLID' },
                        innerHorizontal: { style: 'SOLID' },
                        innerVertical: { style: 'SOLID' }
                    }
                }]
            }
        })

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: EXCEL_FILE_ID,
            requestBody: {
                requests: [{
                    updateBorders: {
                        range: {
                            sheetId,
                            startRowIndex: 1,
                            startColumnIndex: 5,
                            endColumnIndex: 6
                        },
                        right: { style: 'SOLID' }
                    }
                }]
            }
        })

    }

    /**
     * Metodo para actualizar la carpeta alojada en Google Drive, que contiene los radicados con sus respectivas facturas.     
     */
    async updateRadicadosFolder(context: BrowserContext, page: Page, updatePreradicados: { date: string, code: string, radicado: string }[]) {
        try {
            console.log('\nUpdating radicados folder...\n')
            for (const preRadicado of updatePreradicados) {
                const preRadicadoFolder = (await googleapis.drive.getDriveFolder(RADICADOS_FOLDER_ID, preRadicado.code))?.id
                if (!preRadicadoFolder) continue

                await googleapis.drive.changeFolderName(preRadicadoFolder, preRadicado.radicado)
                console.log(`Folder ${preRadicado.code} updated to ${preRadicado.radicado} successfully.`)

                //* Certificate
                const EPSService = this.EPSServices(context, page)
                console.log('---')
                console.log('Downloading certificate')
                const radicadoCertificate = await EPSService.getRadicadoCertificate(preRadicado.radicado)
                if (!radicadoCertificate) throw new Error(EPSService.message)

                // Upload certificate
                const uploadCertificate = await googleapis.drive.uploadDriveFile(
                    preRadicadoFolder,
                    radicadoCertificate.filename,
                    radicadoCertificate.buffer
                )
                if (!uploadCertificate) throw new Error()
                console.log('Certificate uploaded')

                console.log(`Preradicado ${preRadicado.code}/${preRadicado.radicado} finished\n`)
            }

            return true
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.success = false
                this.message = `Error al actualizar carpeta radicados: ${err.message}`
            }
            return false
        }
    }

    async updateRadicadosFolderOld(context: BrowserContext, page: Page, preRadicadosData: { date: string, code: string, radicado: string }[]) {
        try {
            console.log('\nProcessing files...\n')
            const sftp = await CooSaludBot.connectSftp()
            if (!sftp) return

            for (const preRadicado of preRadicadosData) {
                const radicado = preRadicado.radicado

                // Verify existing folder in drive
                const radicadoFolderExists = await googleapis.drive.getDriveFolder(RADICADOS_FOLDER_ID, radicado)
                if (radicadoFolderExists) {
                    console.log(`Folder ${radicado} exists in Drive... continue\n`)
                    continue
                }

                console.log(`Downloading ${preRadicado.code} folder`)
                let downloadAttempts = 0
                let folderDownloaded = false
                let sftpMessage = ''
                while (!folderDownloaded && downloadAttempts < 5) {
                    const downloadSftpFolder = await CooSaludBot.getSftpFolder(sftp, preRadicado.code)
                    folderDownloaded = downloadSftpFolder.success
                    sftpMessage = downloadSftpFolder.message
                    downloadAttempts++
                }
                if (!folderDownloaded) throw new Error(sftpMessage)
                console.log(`Folder ${preRadicado.code} downloaded`)

                const folderPath = path.join(process.cwd(), 'local', preRadicado.code)

                // Create folder
                const radicadoFolder = await googleapis.drive.createDriveFolder(RADICADOS_FOLDER_ID, radicado)
                if (!radicadoFolder) throw new Error()
                console.log(`Folder ${radicado} created in Drive`)
                console.log('---')

                //* Files
                const IMGFolders = fs.readdirSync(`${folderPath}/IMG`)
                for (const billFolder of IMGFolders) {
                    const bill = billFolder
                    const billDriveFolder = await googleapis.drive.createDriveFolder(radicadoFolder, billFolder)
                    if (!billDriveFolder) throw new Error()
                    console.log(`Folder ${radicado}/${billFolder} created in Drive`)
                    const billFileNames = fs.readdirSync(`${folderPath}/IMG/${billFolder}`)

                    // IMG files
                    for (const fileName of billFileNames) {
                        const fileCode = getFileType(fileName) === 'xml' ? 'XML' : fileName.split('_')[0]
                        if (!fileCode || fileCode !== 'XML' && fileCode !== 'FEV' && fileCode !== 'HEV') continue
                        const fileBuffer = fs.readFileSync(`${folderPath}/IMG/${billFolder}/${fileName}`)
                        await googleapis.drive.uploadDriveFile(billDriveFolder, fileName, fileBuffer)
                    }

                    // CUV file
                    const CUVFileName = `CUV_${bill}.json`
                    const CUVFileBuffer = fs.readFileSync(`${folderPath}/RIPS/${CUVFileName}`)
                    await googleapis.drive.uploadDriveFile(billDriveFolder, CUVFileName, CUVFileBuffer)
                    // RIPS file
                    const RIPSFileName = `${bill}.json`
                    const RIPSFileBuffer = fs.readFileSync(`${folderPath}/RIPS/${RIPSFileName}`)
                    await googleapis.drive.uploadDriveFile(billDriveFolder, RIPSFileName, RIPSFileBuffer)

                    console.log('Files uploaded')
                }

                //* Certificate
                const EPSService = this.EPSServices(context, page)
                console.log('---')
                console.log('Downloading certificate')
                const radicadoCertificate = await EPSService.getRadicadoCertificate(radicado)
                if (!radicadoCertificate) throw new Error(EPSService.message)

                // Upload certificate
                const uploadCertificate = await googleapis.drive.uploadDriveFile(
                    radicadoFolder,
                    radicadoCertificate.filename,
                    radicadoCertificate.buffer
                )
                if (!uploadCertificate) throw new Error()
                console.log('Certificate uploaded')

                // Delete local radicado folder
                if (!TEST) fs.rmSync(folderPath, {
                    recursive: true,
                    force: true
                })

                console.log(`\nPreradicado ${preRadicado.code}/${radicado} finished\n`)
            }

            await sftp.end()
            return true
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.success = false
                this.message = `Error al actualizar carpeta radicados: ${err.message}`
            }
            return false
        }
    }

    /**
     * Metodo para el **cargue de una factura a Google Drive**.
     * @param {BillDataType} billData Objeto con los datos de la factura
     */
    static async uploadDriveBill(billData: BillDataType) {
        try {
            const preRadicado = billData.radicado
            if (!preRadicado) throw new Error('No se encontro el preradicado de la factura')

            // Find folder
            let preRadicadoFolder = (await googleapis.drive.getDriveFolder(RADICADOS_FOLDER_ID, preRadicado))?.id

            if (!preRadicadoFolder) {
                // Create folder
                const newFolder = await googleapis.drive.createDriveFolder(RADICADOS_FOLDER_ID, preRadicado)
                if (!newFolder) throw new Error
                preRadicadoFolder = newFolder
            }

            // Create bill folder
            const billFolder = await googleapis.drive.createDriveFolder(preRadicadoFolder, billData.bill)
            if (!billFolder) throw new Error

            // Upload files
            for (const file of billData.files) await googleapis.drive.uploadDriveFile(billFolder, file.name, file.buffer)

            billData.message = 'Factura, RIPS & HEV cargados en SFTP y Google Drive'
            return billData
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                billData.success = false
                billData.status = 'GOOGLE_DRIVE_ERROR'
                billData.message = `Error al cargar archivos en Google Drive: ${err.message}`
            }
            return billData
        }
    }
}