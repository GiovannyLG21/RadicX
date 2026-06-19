/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs'
import { BrowserContext, Page } from 'playwright'
import SftpClient from 'ssh2-sftp-client'
import ExcelJS from 'exceljs'
import { CONTRACTS, CREDENTIALS, SFTP_CONNECTION } from './config/config'
import { delay, formatError, LoginPage } from '@/Bot/utils'
import { BillDataType, ExcelRowData, LoginDataType, RadicacionCodesType } from '@/Bot/types'
import path from 'path'
import { formatDate } from '@/utils/dates'

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
    private sftp: SftpClient

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
        this.sftp = new SftpClient()
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
     * Metodo para crear un cliente sftp con conexion.
     */
    static async connectSftp() {
        const sftp = new SftpClient()
        await sftp.connect({
            host: SFTP_CONNECTION.host,
            port: SFTP_CONNECTION.port,
            username: SFTP_CONNECTION.user,
            password: SFTP_CONNECTION.password
        })
        return sftp
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
                host: SFTP_CONNECTION.host,
                port: SFTP_CONNECTION.port,
                username: SFTP_CONNECTION.user,
                password: SFTP_CONNECTION.password
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
     * @param {string} code Codigo del preradicado
     * @param {number} billsNum Cantidad de facturas del preradicado 
     */
    async getPreRadicadoData(code: string, billsNum?: number): Promise<ExcelRowData | undefined> {
        try {
            await this.login()
            if (!this.success) return

            await this.page.goto('https://vco.ctamedicas.com/app/radicaciones')

            let data: ExcelRowData = []
            let attempts = 0
            while (attempts < 5 && !data.length) {
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
                    const codeCell = row.getCell(5).value as string
                    if (codeCell === code) {
                        // Fecha radicacion column
                        const fechaRadicacion = row.getCell(8).value as string
                        if (fechaRadicacion) row.getCell(8).value = formatDate(new Date(fechaRadicacion))
                        // Cantidad facturas column
                        if (billsNum) row.getCell(9).value = billsNum

                        data = worksheet?.getRow(rowNumber).values as ExcelRowData
                    }
                })
                // Data
                attempts++
            }
            if (!data.length) throw new Error(`No se encontro el pre-radicado ${code}`)

            return data.slice(1, 13)
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
     * Metodo para **obtener los datos de preradicados**,
     * descargando el archivo excel de la plataforma.
     * @param {string} codes Lista de preradicados a buscar.
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
                    const codeCell = String(row.getCell(5).value).trim()
                    if (codes.includes(codeCell)) {
                        // Fecha radicacion column
                        const fechaRadicacion = row.getCell(8).value as string
                        if (fechaRadicacion) row.getCell(8).value = formatDate(new Date(fechaRadicacion))

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
                this.message = `Error al obtener datos de los pre-radicados: ${formatError(err.message)}`
            }
        }
    }

    /**
     * Metodo para obtener el acta de un radicado.
     * @param code Codigo del radicado
     */
    async getRadicadoCertificate(code: string) {
        try {
            await this.login()
            if (!this.success) return

            await this.page.goto('https://vco.ctamedicas.com/app/radicaciones')

            const initDate = '2026-01-01'
            const actualDate = formatDate(new Date(), 'RESVERSED')
            //Set 'Filtro Fecha'
            await this.page.locator('#filterBy').selectOption('radicacion.creacion_fecha')
            // Set 'Fecha Inicio'
            await this.page.locator('#fechaIni').fill(initDate)
            // Set 'Fecha Fin'
            await this.page.locator('#fechaFin').fill(actualDate)
            // Button 'Consultar'
            await this.page.locator('#btBolsaSearchRads').click()
            // Table search
            await this.page.locator('#tablaRadicaciones_filter input').fill(code)
            //!Verificar si el radicado existe en la tabla

            // Table
            const radicadosRow = this.page.locator('#tablaRadicaciones tbody tr').first()
            const radicadoCertificateBtn = radicadosRow.locator('td').nth(11).locator('button')

            const [newPage] = await Promise.all([
                this.context.waitForEvent('page'),
                radicadoCertificateBtn.click()
            ])

            const iframeSrc = await newPage.locator('iframe').getAttribute('src')
            const fileUrl = `https://vco.ctamedicas.com/app/${iframeSrc}`
            const fileDownload = await fetch(fileUrl)
            if (!fileDownload.headers.get('content-type')?.includes('application/pdf')) throw new Error('Archivo PDF corrupto')

            const fileBuffer = Buffer.from(await fileDownload.arrayBuffer())

            return {
                filename: `Acta Radicacion ${code}.pdf`,
                buffer: fileBuffer
            }

        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.success = false
                this.message = `Error al obtener el acta del radicado: ${formatError(err.message)}`
            }
        }
    }

    /**
     * Metodo para obtener una carpeta del sftp y guardarla localmente.
     * @param sftp Cliente sftp con conexion
     * @param folderName Nombre de la carpeta
     */
    static async getSftpFolder(sftp: SftpClient, folderName: string) {
        const localPath = path.join(process.cwd(), 'local')
        fs.mkdirSync(localPath, { recursive: true })

        const folderPath = path.join(process.cwd(), 'local', folderName)
        const actualFolder = fs.existsSync(folderPath)
        if (actualFolder) return true

        const existsFolder = await sftp.exists(`/${folderName}`)
        if (!existsFolder) throw new Error('Carpeta no encontrada en sftp')

        await sftp.downloadDir(`/${folderName}`, `./local/${folderName}`)

        return true
    }
}

export default CooSaludBot