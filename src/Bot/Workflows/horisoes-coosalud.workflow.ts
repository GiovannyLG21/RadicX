import { BrowserContext, Page } from 'playwright'
import CooSaludBot from '../EPS/CooSalud'
import HorisoesBot from '../IPS/Horisoes'
import { execPlaywright, newContext } from '..'
import { playwrightFlow } from '../config/flows'
import { BillDataType, FlowChildJobType, RadicacionCodesType } from '../types'
import { playwrightQueue } from '../config/queues'
import * as executionService from '@/modules/Execution/execution.service'
import { createExecutionDataType } from '@/modules/Execution/execution.types'

/**
 * @class Iniciador de un workflow para la creacion de un flow y sus jobs 
 * @method run: Creacion de Jobs e inicializacion del flow     
 */
export class HorisoesCoosaludInitiator {
    public execution: createExecutionDataType | undefined

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
     * Variable de codigo de estado http del bot
     * @param {boolean} status Codigo de estado http de la ejecucion
     */
    public status: number

    /**
     * Variable de estado del bot
     * @param {string} message Mensaje de los metodos ejecutados     
     */
    public message: string

    private maxJobs: number

    constructor(
        private bills: string[]
    ) {
        this.success = true
        this.status = 200
        this.message = ''
        this.maxJobs = 4000
        this.radicacionCodes = []
    }

    /**
     * Verificacion de Jobs en estado 'waiting' y Jobs entrantes, evitando nuevos si es superada la cuota maxima.
     */
    private async availableSpace() {
        const waitingJobs = await playwrightQueue.getWaitingCount()
        if (waitingJobs + this.bills.length > this.maxJobs) {
            this.success = false
            this.status = 409
            this.message = `Esta intentando añadir ${this.bills.length} facturas a una cola con ${waitingJobs} en proceso. El maximo de facturas en proceso es de ${this.maxJobs}.`
            return false
        }
        return true
    }

    /**
     * Creacion de los pre-radicados los cuales son pasados
     * como parametro a cada Job.     
     */
    private async createRadicados() {
        const browser = await execPlaywright()
        const context = await newContext(browser)
        const page = await context.newPage()

        const EPS = new CooSaludBot(context, page)
        // Create 'radicados' for flow jobs       
        const radicacionCodes = await EPS.createRadicados()
        if (!radicacionCodes) {
            this.success = EPS.success
            this.status = 500
            this.message = EPS.message
            return
        }

        await browser.close()

        this.radicacionCodes = radicacionCodes
        return radicacionCodes
    }

    private async createExecution() {
        const ipsCode = '901749264'
        const epsCode = 'EPS042'
        const metadata = '{}'

        const execution = await executionService.createExecution({ ipsCode, epsCode, metadata })
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
     * Creacion de Jobs e inicializacion del flow
     */
    async run() {
        const availableSpace = await this.availableSpace()
        if (!availableSpace) return

        const radicacionCodes = await this.createRadicados()
        if (!radicacionCodes) return

        await this.createExecution()

        const Jobs = this.createJobs()

        await playwrightFlow.add({
            name: `bills-flow-${this.execution?.id}`,
            data: {
                executionId: this.execution?.id,
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