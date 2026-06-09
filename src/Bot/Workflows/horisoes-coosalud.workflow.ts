import { BrowserContext, Page } from 'playwright'
import CooSaludBot from '../EPS/CooSalud'
import HorisoesBot from '../IPS/Horisoes'
import { execPlaywright, newContext } from '..'
import { playwrightFlow } from '../config/flows'
import { BillDataType, ExcelRowData, FlowChildJobType, HorisoesCoosaludMetadataType, RadicacionCodesType } from '../types'
import { playwrightQueue } from '../config/queues'
import { CreateExecutionReturnType } from '@/modules/Execution/execution.types'
import * as executionService from '@/modules/Execution/execution.service'
import { sheets } from '../config/googleapis'
import { EXCEL_FILE_ID } from '../IPS/Horisoes/config/config'

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

    /**
     * @param {RadicacionCodesType} radicacionCodes Array de objetos con los codigos de radicacion creados
     */
    private radicacionCodes: RadicacionCodesType

    constructor(
        private bills: string[]
    ) {
        this.ipsCode = '901749264'
        this.epsCode = 'EPS042'
        this.success = true
        this.status = 200
        this.message = ''
        this.maxJobs = 4000
        this.radicacionCodes = []
    }

    /**
     * Verificacion de Jobs en estado **waiting** y Jobs **entrantes**.
     * 
     * Este metodo evita la insercion de nuevos Jobs si es superada la cuota maxima definida en **maxJobs**.
     */
    private async availableSpace() {
        const waitingJobs = await playwrightQueue.getWaitingCount()
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
    private async createRadicados() {
        const browser = await execPlaywright()
        const context = await newContext(browser)
        const page = await context.newPage()

        const EPSBot = new CooSaludBot(context, page)
        const radicacionCodes = await EPSBot.createRadicados()
        if (!radicacionCodes) {
            this.success = EPSBot.success
            this.status = 500
            this.message = EPSBot.message
            return
        }
        await browser.close()

        this.radicacionCodes = radicacionCodes
        return radicacionCodes
    }

    /**
     * Metodo para la creacion de una **ejecución**.     
     */
    private async createExecution() {
        const execution = await executionService.createExecution({ ipsCode: this.ipsCode, epsCode: this.epsCode })
        this.execution = execution
        return execution
    }

    /**
     * Creacion de Jobs apartir de las facturas proporcionadas     
     */
    private createJobs() {
        const Jobs: FlowChildJobType[] = this.bills.map((bill, index) => ({
            name: `process-bill-${bill}`,
            queueName: 'playwright-queue',
            data: {
                executionId: this.execution?.id,
                flow: `bills-flow-${this.execution?.id}`,
                bill,
                radicacionCodes: this.radicacionCodes
            },
            opts: {
                jobId: `${index + 1}_${bill}_${this.execution?.id}`,
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
        const availableSpace = await this.availableSpace()
        if (!availableSpace) return

        const radicacionCodes = await this.createRadicados()
        if (!radicacionCodes) return

        const execution = await this.createExecution()

        const Jobs = this.createJobs()

        await playwrightFlow.add({
            name: `bills-flow-${execution?.id}`,
            data: {
                executionId: execution?.id,
                radicacionCodes: radicacionCodes,
                bills_cant: this.bills.length,
                bills: this.bills
            },
            queueName: 'playwright-flow',
            children: Jobs,
            opts: {
                attempts: 5,
                backoff: {
                    type: 'fixed',
                    delay: 60000
                }
            }
        })


    }
}

/**
 * @class **Workflow** para el manejo de cada factura, usado directa y exclusivamente por el worker correspondiente.
 */
export class HorisoesCoosaludWorkflow {

    /**
     * @class **Clase Bot** perteneciente a la **IPS Horisoes**.
     */
    private IPS: HorisoesBot

    /**
     * @class **Clase Bot** perteneciente a la **EPS CooSalud**.
     */
    private EPS: CooSaludBot

    /**
     * @param {BillDataType} billData Objeto con los datos y archivos de la factura procesada/por procesar.
     */
    public billData: BillDataType

    constructor(
        private context: BrowserContext,
        private page: Page,
        private bill: string,
        private radicacionCodes: RadicacionCodesType
    ) {
        this.IPS = new HorisoesBot(this.context, this.page, this.bill)
        this.EPS = new CooSaludBot(this.context, this.page)
        this.billData = this.IPS.billData
    }

    async run() {
        await this.IPS.getBillFiles()
        await this.IPS.getRipsFiles()
        await this.IPS.getHEVFiles()

        this.billData = this.IPS.billData

        const radicadoCode = this.radicacionCodes.find(radicado => radicado.contract == this.billData.contract)?.code
        if (radicadoCode) this.billData.radicado = radicadoCode

        await this.EPS.uploadBill(this.billData)

        return this.billData
    }
}

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

    /**
    * Metodo para obtener todos los preradicados creados en la plataforma de la EPS.
    */
    async getPreRadicadosCreated() {
        const executions = await executionService.getExecutions(this.ipsCode, this.epsCode)

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
    async updatePreRadicadoData(data: ExcelRowData) {
        try {
            await sheets.spreadsheets.values.append({
                spreadsheetId: EXCEL_FILE_ID,
                range: 'Radicados!A:I',
                valueInputOption: 'RAW',
                requestBody: {
                    values: [data.slice(1)]
                }
            })

            return true
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.success = false
                this.message = `Error al actualizar archivo pre-radicados: ${err.message}`
                return false
            }
        }
    }

    /**
     * Metodo para actualizar el archivo excel (archivo de seguimiento en drive) insertando informacion nueva de los preradicados.
     * @param data Valores de filas excel con los datos de cada preradicado
     */
    async updatePreRadicadosFile(data: ExcelRowData[]) {
        try {
            const file = await sheets.spreadsheets.get({
                spreadsheetId: EXCEL_FILE_ID
            })
            const sheetId = file.data.sheets?.find(sheet => sheet.properties?.title === 'Radicados')?.properties?.sheetId ?? null

            const fileRows = await sheets.spreadsheets.values.get({
                spreadsheetId: EXCEL_FILE_ID,
                range: 'Radicados!E:E'
            })
            const fileCodes = fileRows.data.values || []

            for (const codeValues of data) {
                const code = codeValues[4]
                const radicado = codeValues[7]
                const rowIndex = fileCodes.findIndex(row => row[0] === code)
                if (rowIndex) {
                    const rowNumber = rowIndex + 1
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: EXCEL_FILE_ID,
                        range: `Radicados!A${rowNumber}:L${rowNumber}`,
                        valueInputOption: 'USER_ENTERED',
                        requestBody: {
                            values: [codeValues],
                        }
                    })
                    if (!radicado) {
                        await sheets.spreadsheets.batchUpdate({
                            spreadsheetId: EXCEL_FILE_ID,
                            requestBody: {
                                requests: [{
                                    repeatCell: {
                                        range: {
                                            sheetId,
                                            startColumnIndex: 0,
                                            endColumnIndex: 12,
                                            startRowIndex: rowIndex,
                                            endRowIndex: rowIndex + 1
                                        },
                                        cell: {
                                            userEnteredFormat: {
                                                backgroundColor: {
                                                    red: 1,
                                                    green: 0,
                                                    blue: 0
                                                }
                                            }
                                        },
                                        fields: 'userEnteredFormat.backgroundColor'
                                    }
                                }]
                            }
                        })
                    }
                    continue
                }
                await sheets.spreadsheets.values.append({
                    spreadsheetId: EXCEL_FILE_ID,
                    range: 'Radicados!A:L',
                    valueInputOption: 'RAW',
                    requestBody: {
                        values: [codeValues]
                    }
                })
            }

            const preRadicadosData = data.map(pre_radicado => ({
                date: pre_radicado[7] ? new Date(pre_radicado[7] as string).toLocaleDateString('es-CO') : null,
                code: String(pre_radicado[4]),
                radicado: pre_radicado[10] ? String(pre_radicado[10]) : null
            }))

            await this.createRadicadosSheet(preRadicadosData)

            return true
        } catch (err) {
            if (err instanceof Error) {
                console.error(err.message)
                this.success = false
                this.message = `Error al actualizar archivo en linea: ${err.message}`
                return false
            }
        }
    }

    /**
     * Metodo para crear una hoja en el archivo excel (archivo de seguimiento en drive) con todas las facturas de los radicados 
     * proporcionados al invocar el metodo **updatePreRadicadosFile**.
     * @param preRadicadosData Datos de los radicados a procesar
     */
    private async createRadicadosSheet(preRadicadosData: { date: string | null, code: string, radicado: string | null }[]) {
        try {
            const actualDate = new Date()
            const [day, month, year] = [
                String(actualDate.getDay()).padStart(2, '0'),
                String(actualDate.getMonth() + 1).padStart(2, '0'),
                String(actualDate.getFullYear()).slice(2)
            ]

            const sheetName = `Consolidado ${day}.${month}.${year}`
            const file = await sheets.spreadsheets.get({
                spreadsheetId: EXCEL_FILE_ID
            })
            const existingSheet = file.data.sheets?.some(sheet => sheet.properties?.title === sheetName)
            if (existingSheet) return true


            //* Data
            const fileData: {
                date: string,
                bill: string,
                eps: 'COOSALUD ENTIDAD PROMOTORA DE SALUD S.A',
                modality: 'PAQUETE',
                radicado: string,
                user: 'HORIBOT'
            }[] = []

            for (const preRadicado of preRadicadosData) {
                if (!preRadicado.date || !preRadicado.radicado) continue
                const bills = await this.getPreRadicadoBills(preRadicado.code)
                for (const bill of bills) {
                    fileData.push({
                        date: preRadicado.date,
                        bill,
                        eps: 'COOSALUD ENTIDAD PROMOTORA DE SALUD S.A',
                        modality: 'PAQUETE',
                        radicado: preRadicado.radicado,
                        user: 'HORIBOT'
                    })
                }
            }
            const formattedFileData = fileData.map(object => Object.values(object))


            //* Create sheet
            const sheetResponse = await sheets.spreadsheets.batchUpdate({
                spreadsheetId: EXCEL_FILE_ID,
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: sheetName,
                            },
                        }
                    }]
                }
            })
            const sheetId = sheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId as number | null

            //* Header
            await sheets.spreadsheets.values.append({
                spreadsheetId: EXCEL_FILE_ID,
                range: `${sheetName}!A1:F1`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [[
                        "FECHA RADICACION",
                        "FACTURA",
                        "EPS",
                        "MODALIDAD",
                        "NUM RADICADO",
                        "USUARIO"
                    ]]
                }
            })

            //* Insert rows
            await sheets.spreadsheets.values.append({
                spreadsheetId: EXCEL_FILE_ID,
                range: `${sheetName}!A2:F`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values: formattedFileData
                }
            })

            await this.formatRadicadosSheet(sheetId)

            return true
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.success = false
                this.message = `Error al crear consolidado de Pre-radicados: ${err.message}`
                return false
            }
        }
    }

    /**
     * Metodo para aplicar el formato a una hoja de radicados (Consolidado).
     * @param sheetId Id de la hoja del archivo     
     */
    private async formatRadicadosSheet(sheetId: number | null) {
        if (!sheetId) return

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
}