import { BrowserContext, Page } from 'playwright'
import BillFlow from './modules/bill.flow'
import RIPSFlow from './modules/rips.flow'
import { BillDataType, ExcelRowData, LoginDataType } from '@/Bot/types'
import { LoginPage, downloadDriveFile, formatError } from '@/Bot/utils'
import { CREDENTIALS, EXCEL_FILE_ID, HEV_FOLDER_ID } from './config/config'
import { sheets } from '@/Bot/config/googleapis'

/**
 * @class **Clase Bot** perteneciente a la **IPS Horisoes**.
 *  
 * @method **getBillFiles** Metodo para obtener el archivo de una factura de acuerdo al codigo de factura proporcionado.    
 * @method **getRIPSFiles** Metodo para obtener el archivo de una factura de acuerdo al codigo de factura proporcionado.    
 * @method **getHEVFiles** Metodo para definir un fallo en billData por una respuesta del BillFlow o RIPSFlow.    
 * @method **updatePreRadicadoFile** Metodo para actualizar el archivo excel (archivo de seguimiento) en drive insertando un nuevo pre-radicado.
 * 
 * Cada metodo ejecutado retorna "void", en cambio, actualiza la variable 'billData' segun el resultado de la ejecucion. 
 * Esta contiene toda la informacion del proceso. 
 */
class HorisoesBot {
    public ipsCode: string

    /**
    * @param {LoginPage} loginPage Clase 'login' para el logueo en plataforma 
    */
    private loginPage: LoginPage

    /** 
    * @param {LoginDataType} loginData Objeto con datos para el logueo en plataforma    
     */
    private loginData: LoginDataType

    /**
     * @param {BillDataType} billData Objeto con los datos y archivos de la factura procesada/por procesar
     */
    public billData: BillDataType

    /**
     * @param {BillFlow} billFlow **Flow** para la descarga de la factura.
     */
    private billFlow: BillFlow

    /**
     * @param {RIPSFlow} ripsFlow **Flow** para la descarga de los archivos RIPS y CUV de la factura.
     */
    private ripsFlow: RIPSFlow

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

    constructor(
        private context: BrowserContext,
        private page: Page,
        private bill: string,
    ) {
        this.ipsCode = '901749264'
        this.loginData = {
            sessionSelector: '.o-dropdown.dropdown.o_user_menu',
            userSelector: '#login',
            passwordSelector: '#password',
            buttonSelector: '.btn[type="submit"]',
            credentials: {
                user: CREDENTIALS.user,
                password: CREDENTIALS.password
            }
        }
        this.loginPage = new LoginPage(this.context, this.page, this.loginData)
        this.billData = {
            bill: this.bill,
            contract: null,
            success: true,
            status: null,
            message: '',
            files: []
        }
        this.billFlow = new BillFlow(page, bill)
        this.ripsFlow = new RIPSFlow(page, bill)
        this.success = true
        this.message = ''
    }

    private async login() {
        const page = this.page
        const billData = this.billData
        try {
            await page.goto('https://horizonte.driverp.com/web')
            const login = await this.loginPage.run()
            if (!login) {
                billData.success = false
                billData.status = 'LOGIN_FAILED'
                billData.message = 'Error al iniciar sesion en ODOO'
                this.billData = billData
            }
        } catch (err) {
            if (err instanceof Error) {
                console.error(err.message)
                billData.success = false
                billData.status = 'LOGIN_FAILED'
                billData.message = `Error al iniciar sesion en ODOO: ${formatError(err.message)}`
                this.billData = billData
            }
        }
    }

    /**
     * Metodo para obtener el archivo de una factura de acuerdo al codigo de factura proporcionado.    
     */
    async getBillFiles() {
        await this.login()
        if (!this.billData.success) return
        const billFlow = this.billFlow

        const zipBuffer = await billFlow.downloadFiles()
        if (!zipBuffer) return this.setFail(billFlow)

        const billFiles = await billFlow.getFiles(zipBuffer)
        if (!billFiles) return this.setFail(billFlow)

        const FEVFileBuffer = billFiles.find(file => file.code == 'FEV')?.buffer
        const billContract = await billFlow.getContract(FEVFileBuffer)
        if (!billContract) return this.setFail(billFlow)

        this.billData = {
            bill: this.bill,
            contract: billContract,
            success: true,
            status: 'SUCCESS',
            message: 'Factura descargada',
            files: billFiles
        }
    }

    /**
     * Metodo para obtener los archivos RIPS y CUV de una factura.     
     */
    async getRipsFiles() {
        if (!this.billData.success) return
        const ripsFlow = this.ripsFlow

        const zipBufferFiles = await ripsFlow.downloadFiles()
        if (!zipBufferFiles) return this.setFail(ripsFlow)

        const RIPSFiles = await ripsFlow.getFiles(zipBufferFiles, this.bill)
        if (!RIPSFiles) return this.setFail(ripsFlow)

        for (const file of RIPSFiles) this.billData.files.push(file)
        this.billData.message = 'Factura & RIPS descargados'
    }

    /**
     * Metodo para obtener el archivo HEV de una factura.    
     */
    async getHEVFiles() {
        const billData = this.billData
        try {
            if (!billData.success) return
            const RIPSFileBuffer = billData.files.find(file => file.code == 'RIPS')?.buffer
            if (!RIPSFileBuffer) throw new Error('RIPS no encontrado')
            const RIPSfileData = RIPSFileBuffer.toString('utf-8')
            const fileDataParse = JSON.parse(RIPSfileData)

            const userDocType: string = fileDataParse['usuarios'][0]['tipoDocumentoIdentificacion']
            const userDocNum: string = fileDataParse['usuarios'][0]['numDocumentoIdentificacion']
            const userDoc = userDocType + userDocNum

            const HEVFile = await downloadDriveFile(HEV_FOLDER_ID, `${userDoc}_FRAMINGHAM_signed.pdf`)
            if (!HEVFile) {
                billData.success = false
                billData.status = 'NOT_FOUND'
                billData.message = 'HEV no encontrado'
                this.billData = billData
                return
            }

            billData.message = 'Factura, RIPS & HEV descargados'
            billData.files.push({
                code: 'HEV',
                name: `HEV_901011395_${this.bill}.pdf`,
                buffer: HEVFile
            })

            this.billData = billData
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                billData.success = false
                billData.status = 'ERROR'
                billData.message = `Error al descargar HEV: ${formatError(err.message)}`
                this.billData = billData
            }
        }
    }

    /**
     * Metodo para **definir un fallo** en billData por una respuesta del BillFlow o RIPSFlow.    
     */
    private setFail(flow: BillFlow | RIPSFlow) {
        this.billData.success = flow.success
        this.billData.status = flow.status
        this.billData.message = flow.message
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
}

export default HorisoesBot