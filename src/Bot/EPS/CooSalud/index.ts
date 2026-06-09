/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs'
import { BrowserContext, Page } from 'playwright'
import Client from 'ssh2-sftp-client'
import ExcelJS from 'exceljs'
import { CONTRACTS, CREDENTIALS, SFTP_CREDENTIALS } from './config/config'
import { delay, formatError, LoginPage } from '@/Bot/utils'
import { BillDataType, ExcelRowData, LoginDataType, RadicacionCodesType } from '@/Bot/types'
import * as coosaludService from './coosalud.service'

/**
 * @class **Clase Bot perteneciente a la EPS 'CooSalud'.**  
 * @method **createRadicados** Metodo para la creacion de radicados de acuerdo a los dos numeros de contrato disponibles: Subsidiado y contributivo  
 * @method **uploadBill** Metodo para el cargue de archivos de una factura procesada al sftp de la plataforma
 * @method **getPreRadicadoData** Metodo para obtener los datos de un preradicado recien creado, descargando el archivo excel de la plataforma.
 * @method **getPreRadicadosData** Metodo para obtener todos los datos de los preradicados proporcionados.
 * @method **createRadicadoFile** Metodo para generar un archivo excel con las facturas de un 'pre-radicado' despues de pasar a estado 'radicado'.
 */
class CooSaludBot {
    public epsCode: string

    /**
     * @param {Client} sftp Cliente para el manejo del sftp.
     */
    private sftp: Client

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

    /**
     * @param {LoginPage} loginPage Clase 'login' para el logueo en plataforma 
    */
    private loginPage: LoginPage

    /** 
    * @param {LoginDataType} loginData Objeto con datos para el logueo en plataforma    
     */
    private loginData: LoginDataType

    /**
     * @param {RadicacionCodesType} radicacionCodes Array de objetos con los codigos de radicacion creados
     */
    public radicacionCodes: RadicacionCodesType

    constructor(
        private context: BrowserContext,
        private page: Page
    ) {
        this.epsCode = 'EPS042'
        this.sftp = new Client()
        this.success = true
        this.message = ''
        this.loginData = {
            sessionSelector: 'a.sidebar-nav-link[href="#radicaciones"]',
            userSelector: '#usuarioIngreso',
            passwordSelector: '#contraseniaIngreso',
            buttonSelector: '[name="validarSesion"]',
            credentials: {
                user: CREDENTIALS.user,
                password: CREDENTIALS.password
            }
        }
        this.loginPage = new LoginPage(this.context, this.page, this.loginData)
        this.radicacionCodes = []
    }

    private async login() {
        try {
            await this.page.goto('https://vco.ctamedicas.com/app/')
            const login = await this.loginPage.run()
            if (!login) {
                this.success = false
                this.message = 'Error al iniciar sesion en CooSalud'
            }
        } catch (err) {
            if (err instanceof Error) {
                console.error(err.message)
                this.success = false
                this.message = `Error al iniciar sesion en CooSalud: ${formatError(err.message)}`
            }
        }
    }

    /**
     * Metodo para la **creacion de radicados** de acuerdo a los dos numeros de 
     * contrato disponibles: Subsidiado y Contributivo.
     */
    async createRadicados() {
        const page = this.page
        try {
            await this.login()
            if (!this.success) return

            await this.page.goto('https://vco.ctamedicas.com/app/radicaciones')
            // Button 'Crear Radicacion'
            const buttonRadicacion = this.page.locator('.btn.btn-success[aria-controls="tablaRadicaciones"]')
            // Set Options
            const typeOption = page.locator('#typeRadAuto')
            const typeContrOption = page.locator('#typeContraAuto')
            const numContrOption = page.locator('#numContraAuto')
            const typeServOption = page.locator('#typeServAuto')
            // Button 'Crear radicacion'
            const buttonCreate = this.page.locator('#btCreateRadIps')

            //* Create radicados
            const radicacionCodes: RadicacionCodesType = []
            for (const contract of CONTRACTS) {
                await buttonRadicacion.click()
                await typeOption.selectOption('Res 2275 de 2023 (JSON)')
                await typeContrOption.selectOption('PAQUETE')
                await numContrOption.selectOption(contract.code)
                await typeServOption.selectOption('PRO_POS')
                await buttonCreate.click()
                // Await confirmation and reload
                await delay(1000)
                await page.reload()
                //* Get radicado
                // Set 'Mostrar' in 'Todos'
                await this.page.locator('[name="tablaRadicaciones_length"]').selectOption('-1')
                // Table rows
                const radicaciones = this.page.locator('#tablaRadicaciones tbody tr')
                const createdRadicacion = radicaciones.last()
                const codeRadicacion = await createdRadicacion.locator('td').nth(3).textContent() as string

                radicacionCodes.push({
                    contract: contract.contract,
                    code: codeRadicacion.trim()
                })
            }

            this.radicacionCodes = radicacionCodes
            return radicacionCodes
        } catch (err) {
            if (err instanceof Error) {
                this.success = false
                this.message = `Error al crear la radicacion: ${formatError(err.message)}`
                return
            }
        }
    }

    /**
     * Metodo para el cargue de archivos de una factura procesada al sftp de la plataforma.
     * @param {billDataType} billData Objeto con los datos y archivos de la factura      
     */
    async uploadBill(billData: BillDataType) {
        if (!billData.success || !billData.radicado) return billData
        const sftp = this.sftp
        try {
            await sftp.connect({
                host: 'vco.ctamedicas.com',
                port: 22,
                username: SFTP_CREDENTIALS.user,
                password: SFTP_CREDENTIALS.password
            })

            const bill = billData.bill
            const radicacionCode = billData.radicado
            const IMGFiles = billData.files.filter(file => file.code == 'XML' || file.code == 'FEV' || file.code == 'HEV')
            const RIPSFiles = billData.files.filter(file => file.code == 'CUV' || file.code == 'RIPS')

            for (const file of RIPSFiles) {
                await sftp.put(file.buffer, `/${radicacionCode}/RIPS/${file.name}`)
            }

            const actualDirectory = await sftp.exists(`/${radicacionCode}/IMG/${bill}`)
            if (!actualDirectory) await sftp.mkdir(`/${radicacionCode}/IMG/${bill}`)
            for (const file of IMGFiles) {
                await sftp.put(file.buffer, `/${radicacionCode}/IMG/${bill}/${file.name}`)
            }

            billData.message = 'Factura, RIPS & HEV cargados en sftp'
            return billData
        } catch (err) {
            await sftp.end()
            if (err instanceof Error) {
                console.error(err.message)
                billData.success = false
                billData.status = 'SFTP_ERROR'
                billData.message = `Error al cargar archivos en sftp: ${formatError(err.message)}`
            }
            return billData
        } finally {
            await sftp.end()
        }
    }

    /**
     * Metodo para **obtener los datos de un preradicado** recien creado,
     * descargando el archivo excel de la plataforma.
     * @param {string} code Codigo generado del pre-radicado
     * @param {number} billsNum Cantidad de facturas del pre-radicado 
     */
    async getPreRadicadoData(code: string, billsNum: number): Promise<ExcelRowData | undefined> {
        try {
            await this.login()
            if (!this.success) return

            await this.page.goto('https://vco.ctamedicas.com/app/radicaciones')

            let data: ExcelRowData | undefined = undefined
            let attempts = 0
            while (attempts < 3 && !data) {
                const downloadExcelBtn = this.page.locator('.btn.buttons-excel')
                const [download] = await Promise.all([
                    this.page.waitForEvent('download'),
                    downloadExcelBtn.click()
                ])
                const downloadPath = await download.path()
                const fileBuffer = fs.readFileSync(downloadPath)

                // Load excel
                const workbook = new ExcelJS.Workbook()
                await workbook.xlsx.load(fileBuffer as any)
                const worksheet = workbook.getWorksheet(1)

                // Find row code                
                worksheet?.eachRow((row, rowNumber) => {
                    const codeCell = row.getCell(5).value
                    if (code === codeCell) {
                        row.getCell(9).value = billsNum
                        row.getCell(13).value = null
                        data = worksheet?.getRow(rowNumber).values as ExcelRowData
                    }
                })
                // Data
                attempts++
            }
            if (!data) throw new Error('No se encontro el pre-radicado')

            return data
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.success = false
                this.message = `Error al obtener datos del pre-radicado: ${err.message}`
                return
            }
        }
    }

    /**
     * Metodo para obtener todos los datos de los preradicados proporcionados
     * @param codes Lista de preradicados a buscar.
     */
    async getPreRadicadosData(codes: string[]) {
        try {
            await this.login()
            if (!this.success) return

            await this.page.goto('https://vco.ctamedicas.com/app/radicaciones')

            const data: ExcelRowData[] = []
            let attempts = 0
            while (attempts < 3 && !data.length) {
                // Download
                const downloadExcelBtn = this.page.locator('.btn.buttons-excel')
                const [download] = await Promise.all([
                    this.page.waitForEvent('download'),
                    downloadExcelBtn.click()
                ])
                const downloadPath = await download.path()
                const fileBuffer = fs.readFileSync(downloadPath)
                const nodeBuffer = Buffer.from(fileBuffer)

                // Load excel
                const workbook = new ExcelJS.Workbook()
                await workbook.xlsx.load(nodeBuffer as any)
                const worksheet = workbook.getWorksheet(1)

                // Find codes             
                worksheet?.eachRow((row) => {
                    const codeCell = row.getCell(5).value as string
                    if (codes.includes(codeCell)) {
                        const rowValues = row.values as ExcelJS.CellValue[]
                        data.push(rowValues.slice(1, 13))
                    }
                })
                attempts++
            }
            if (!data.length) throw new Error('No se encontraron los pre-radicados')

            return data
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.success = false
                this.message = `Error al obtener datos de los pre-radicados: ${err.message}`
            }
        }
    }

    /**
     * Metodo para generar un archivo excel con las facturas de un 'pre-radicado' despues de pasar a estado 'radicado'.
     * @param {string} pre_radicado Codigo del pre_radicado generado      
     */
    private async createRadicadoFile(pre_radicado: string) {
        try {
            await this.login()
            if (!this.success) return

            await this.page.goto('https://vco.ctamedicas.com/app/radicaciones')
            // Set 'Mostrar' in 'Todos'
            await this.page.locator('[name="tablaRadicaciones_length"]').selectOption('-1')
            // Table rows
            const radicaciones = this.page.locator('#tablaRadicaciones tbody tr')
            const row = radicaciones.filter({
                hasText: pre_radicado
            })
            const radicado = await row.locator('td').nth(9).textContent()

            if (radicado) {
                const workbook = new ExcelJS.Workbook()
                const sheet = workbook.addWorksheet(radicado)

                sheet.columns = [
                    { header: 'Fecha', key: 'date', width: 30 },
                    { header: 'Factura', key: 'bill', width: 10 },
                    { header: 'EPS', key: 'eps', width: 10 },
                    { header: 'Modalidad', key: 'type', width: 10 },
                    { header: 'Usuario', key: 'origin', width: 10 },
                ];

                const bills = await coosaludService.getSftpFiles(pre_radicado)
                if (bills) {
                    for (const bill of bills) {
                        sheet.addRow({
                            date: '20/05/2026',
                            bill,
                            eps: 'COOSALUD ENTIDAD PROMOTORA DE SALUD S.A',
                            type: 'PAQUETE',
                            origin: 'HorisoesBot'
                        })
                    }
                }
                await workbook.xlsx.writeFile(`facturas_${radicado}.xlsx`)
            }
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.success = false
                this.message = `Error al generar archivo: ${err.message}`
            }
        }
    }
}

export default CooSaludBot