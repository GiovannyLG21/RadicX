import { BrowserContext, Page } from 'playwright'
import BillFlow from './modules/bill.flow'
import RIPSFlow from './modules/rips.flow'
import { BillDataType, BillServicesType, LoginDataType } from '@/Bot/types'
import { LoginPage, formatError, googleapis } from '@/Bot/utils'
import { CREDENTIALS, FA_FOLDER_ID, FG_FOLDER_ID, GT_FOLDER_ID, PV_FOLDER_ID } from './config/config'

/**
 * @class **Clase Bot** perteneciente a la **IPS Horisoes**.
 *  
 * @method **getBillFiles** Metodo para obtener el archivo de una factura de acuerdo al codigo de factura proporcionado.    
 * @method **getRIPSFiles** Metodo para obtener el archivo de una factura de acuerdo al codigo de factura proporcionado.    
 * 
 * Cada metodo ejecutado retorna "void", en cambio, actualiza la variable 'billData' segun el resultado de la ejecucion. 
 * Esta contiene toda la informacion del proceso. 
 */
class HorisoesBot {

    static availableServices: Record<string, string> = {
        'FRAMINGHAM': 'FG',
        'GESTION_TERRITORIAL': 'GT',
        'FIEBRE_AMARILLA': 'FA',
        'POLIVALENTE': 'PV'
    }

    /**
     * @param {string[]} services Listado de los servicios (distintas formas de cargar una factura) del bot.     
    */
    public services = {
        FG: () => this.getFGFile(), // Framinghan
        GT: () => this.getGTFile(), // Gestion territorial
        FA: () => this.getFAFile(), // Fiebre amarilla
        PV: () => this.getPVFile() // Polivalente
    }

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
        private service: BillServicesType,
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
            service: this.service,
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

    public async servicesStatus() {
        try {
            //Horisoes
            const login = await this.login()
            if (!login) throw new Error(this.message)

            // Googleapis
            const googleServicesStatus = await googleapis.servicesHealthCheck()
            if (!googleServicesStatus?.online) throw new Error(`Google Apis Error - ${googleServicesStatus?.error}`)

            return true
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.success = false
                this.message = `Fallo al inicializar los servicios de Horisoes: ${err.message}`
            }
            return false
        }
    }

    private async login() {
        const page = this.page
        const billData = this.billData
        try {
            await page.goto('https://horizonte.driverp.com/web')
            const login = await this.loginPage.run()
            if (!login) {
                const message = 'No es posible iniciar sesion en ODOO'

                this.success = false
                this.message = message
                billData.success = false
                billData.status = 'LOGIN_FAILED'
                billData.message = message
                this.billData = billData
                return false
            }
            return true
        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                const message = `Error al iniciar sesion en ODOO: ${formatError(err.message)}`

                this.success = false
                this.message = message
                billData.success = false
                billData.status = 'LOGIN_FAILED'
                billData.message = message
                this.billData = billData
            }
            return false
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
            service: this.service,
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

    //* Services

    /**
     * Metodo para **extraer el documento del usuario** desde el archivo RIPS en billData.     
     * @returns ```ts
     * {
            userDocType: 'CC',
            userDocNum: '1234567890',
            userDoc: 'CC1234567890',
        }
     * ```
     */
    private getUserDoc() {
        const RIPSFileBuffer = this.billData.files.find(file => file.code == 'RIPS')?.buffer
        if (!RIPSFileBuffer) throw new Error('RIPS no encontrado')
        const RIPSfileData = RIPSFileBuffer.toString('utf-8')
        const fileDataParse = JSON.parse(RIPSfileData)

        const userDocType: string = fileDataParse['usuarios'][0]['tipoDocumentoIdentificacion']
        const userDocNum: string = fileDataParse['usuarios'][0]['numDocumentoIdentificacion']
        const userDoc = userDocType + userDocNum

        return {
            userDocType,
            userDocNum,
            userDoc,
        }
    }

    private async getDriveFile(folderId: string, searchName: string, service: BillServicesType) {
        try {
            const driveFile = await googleapis.drive.downloadDriveFile(folderId, searchName)
            if (!driveFile) {
                this.billData.success = false
                this.billData.status = 'NOT_FOUND'
                this.billData.message = `HEV (${service}) no encontrado`
                return
            }

            this.billData.message = `Factura, RIPS & HEV (${service}) descargados`
            this.billData.files.push({
                code: 'HEV',
                name: `HEV_901011395_${this.bill}.pdf`,
                buffer: driveFile
            })

        } catch (err) {
            if (err instanceof Error) {
                console.error(err)
                this.billData.success = false
                this.billData.status = 'ERROR'
                this.billData.message = `Error al descargar HEV (${service}): ${formatError(err.message)}`
            }
        }
    }

    /**
     * **Service FG**: --FRAMINGHAM--
     * 
     * Metodo para obtener el archivo HEV de una factura.    
     */
    async getFGFile() {
        if (!this.billData.success) return
        const folderId = FG_FOLDER_ID
        const { userDoc } = this.getUserDoc()
        const searchName = `${userDoc}_FRAMINGHAM_signed.pdf`
        const service = 'FRAMINGHAM'

        await this.getDriveFile(folderId, searchName, service)
    }

    /**
     * **Service GT**: --GESTION TERRITORIAL--
     * 
     * Metodo para obtener el archivo GT de una factura.    
     */
    async getGTFile() {
        if (!this.billData.success) return
        const folderId = GT_FOLDER_ID
        const { userDocNum } = this.getUserDoc()
        const searchName = `${userDocNum}_GESTION_TERRITORIAL.pdf`
        const service = 'GESTION_TERRITORIAL'

        await this.getDriveFile(folderId, searchName, service)
    }

    /**
     * **Service FA**: --FIEBRE AMARILLA--
     * 
     * Metodo para obtener el archivo FA de una factura.    
     */
    async getFAFile() {
        if (!this.billData.success) return
        const folderId = FA_FOLDER_ID
        const { userDoc } = this.getUserDoc()
        const searchName = `${userDoc}_FA_signed.pdf`
        const service = 'FIEBRE_AMARILLA'

        await this.getDriveFile(folderId, searchName, service)
    }

    /**
     * **Service PV**: --POLIVALENTE--
     * 
     * Metodo para obtener el archivo FA de una factura.    
     */
    async getPVFile() {
        if (!this.billData.success) return
        const folderId = PV_FOLDER_ID
        const { userDoc } = this.getUserDoc()
        const searchName = `${userDoc}_PV_signed.pdf`
        const service = 'POLIVALENTE'

        await this.getDriveFile(folderId, searchName, service)
    }

    /**
     * Metodo para **definir un fallo** en billData por una respuesta del BillFlow o RIPSFlow.    
     */
    private setFail(flow: BillFlow | RIPSFlow) {
        this.billData.success = flow.success
        this.billData.status = flow.status
        this.billData.message = flow.message
    }
}

export default HorisoesBot