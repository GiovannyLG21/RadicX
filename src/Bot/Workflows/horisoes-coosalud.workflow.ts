import { BrowserContext, Page } from 'playwright'
import CooSaludBot from '../EPS/CooSalud'
import HorisoesBot from '../IPS/Horisoes'
import { execPlaywright, newContext } from '..'
import { playwrightFlow } from '../config/flows'
import { BillDataType, FlowChildJobType, RadicacionCodesType } from '../types'

/**
 * @class Iniciador de un workflow para la creacion de un flow y sus jobs 
 * @method run: Creacion de Jobs e inicializacion del flow     
 */
export class HorisoesCoosaludInitiator {
    /**
     * @param {RadicacionCodesType} radicacionCodes Array de objetos con los codigos de radicacion creados
     */
    private radicacionCodes: RadicacionCodesType

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
        private executionId: string,
        private bills: string[]
    ) {
        this.success = true
        this.message = ''
        this.radicacionCodes = []
    }

    /**
     * Creacion de Jobs apartir de las facturas proporcionadas
     * Aqui tambien se crean los pre-radicados los cuales son pasados
     * como parametro a cada Job.
     */
    private async createJobs() {
        const browser = await execPlaywright()
        const context = await newContext(browser)
        const page = await context.newPage()

        const EPS = new CooSaludBot(context, page)
        // Create 'radicados' for flow jobs       
        const radicacionCodes = await EPS.createRadicados()
        if (!radicacionCodes) {
            this.success = EPS.success
            this.message = EPS.message
            return
        }
        this.radicacionCodes = radicacionCodes
        await browser.close()

        const Jobs: FlowChildJobType[] = this.bills.map((bill, index) => ({
            name: `process-bill-${bill}`,
            queueName: 'playwright-queue',
            data: {
                executionId: this.executionId,
                flow: `bills-flow-${this.executionId}`,
                bill,
                radicacionCodes
            },
            opts: {
                jobId: `${index + 1}_${bill}_${this.executionId}`,
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
     * Creacion de Jobs e inicializacion del flow
     */
    async run() {
        const Jobs = await this.createJobs()
        if (!Jobs) return

        await playwrightFlow.add({
            name: `bills-flow-${this.executionId}`,
            data: {
                executionId: this.executionId,
                radicacionCodes: this.radicacionCodes,
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
 * @class Workflow para el manejo de cada factura, implementado directamente en el worker correspondiente.
 */
export class HorisoesCoosaludWorkflow {

    /**
     * @class Clase Bot perteneciente a la IPS 'Horisoes'.
     */
    private IPS: HorisoesBot

    /**
     * @class Clase Bot perteneciente a la EPS 'CooSalud'.
     */
    private EPS: CooSaludBot

    /**
     * @param {BillDataType} billData Objeto con los datos y archivos de la factura procesada/a procesar
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