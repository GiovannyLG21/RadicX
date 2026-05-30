import { UnrecoverableError, Worker } from 'bullmq'
import { playwrightFlowQueue, playwrightQueue } from './queues'
import { Browser } from 'playwright'
import { execPlaywright, newContext } from '../index'
import { HorisoesCoosaludWorkflow } from '../Workflows/horisoes-coosalud.workflow'
import CooSaludBot from '../EPS/CooSalud'
import HorisoesBot from '../IPS/Horisoes'
import { REDIS_HOST, REDIS_PASSWORD } from '@/config/env'
import { getDataFromEntries } from '@/utils/objects'
import { JobDataType, ProcessedBillType, RadicacionCodesType } from '../types'
import * as executionService from '@/modules/Execution/execution.service'

console.log('\nWorkers running')
console.log('==================================================')
console.log('\n')

setInterval(() => {
    const m = process.memoryUsage()

    console.log({
        rss: Math.round(m.rss / 1024 / 1024),
        heapUsed: Math.round(m.heapUsed / 1024 / 1024),
        heapTotal: Math.round(m.heapTotal / 1024 / 1024),
        external: Math.round(m.external / 1024 / 1024),
        arrayBuffers: Math.round(m.arrayBuffers / 1024 / 1024),
    })
}, 60000)

//* Globals
let browser: Browser
async function browserManager() {
    browser = await execPlaywright()
}
browserManager()

//==================================================================

async function FlowWorker() {
    //? Main
    const getFailedBills = async (billsIds: string[]): Promise<ProcessedBillType[]> => {
        return await Promise.all(
            billsIds.map(async (id) => {
                const billId = id.replace('bull:playwright-queue:', '')
                return (await playwrightQueue.getJob(billId))?.data?.failedBill
            })
        )
    }
    const playwrightFlowWorker = new Worker('playwright-flow',
        async (job) => {
            const context = await newContext(browser)
            const page = await context.newPage()
            const EPS = new CooSaludBot(context, page)
            const IPS = new HorisoesBot(context, page, '')
            const { executionId, radicacionCodes }: { executionId: string, radicacionCodes: RadicacionCodesType } = job.data
            const { processed, ignored } = await job.getDependencies()

            const successBills: ProcessedBillType[] = getDataFromEntries(processed, 1)
            const successLen = successBills.length

            const failedBillsIds: string[] = getDataFromEntries(ignored, 0)
            const failedBills: ProcessedBillType[] = await getFailedBills(failedBillsIds)
            const failedLen = failedBills.length

            const preRadicados = []

            for (const radicado of radicacionCodes) {
                const radicadoBills = successBills.filter(bill => bill.radicado == radicado.code)

                const data = await EPS.getPreRadicadoData(radicado.code, radicadoBills.length)
                if (data) await IPS.updatePreRadicadoFile(data)

                preRadicados.push({
                    codigo: radicado.code,
                    contrato: radicado.contract,
                    facturas: radicadoBills.map(bill => bill.bill),
                    cantidad_facturas: radicadoBills.length
                })
            }

            const metadata = {
                total_facturas: successLen + failedLen,
                total_radicadas: successLen,
                total_fallidas: failedLen,
                pre_radicados: preRadicados,
                fallidas: {
                    codigos: failedBills.map(bill => bill.bill),
                    facturas: failedBills
                }
            }

            await context.close()
            await executionService.finishExecution(executionId, { metadata })

            // Clean browser
            const waitingFlows = await playwrightFlowQueue.getWaitingCount()
            const waitingChildrenFlows = await playwrightFlowQueue.getWaitingChildrenCount()

            if (waitingFlows === 0 && waitingChildrenFlows === 0) {
                console.log('\nRefrescando navegador...')
                await browser.close()
                await browserManager()
            }
        },
        {
            connection: {
                host: REDIS_HOST,
                port: 6379,
                password: REDIS_PASSWORD,
                maxRetriesPerRequest: null
            },
            concurrency: 1
        }
    )

    //? Status
    playwrightFlowWorker.on('active', () => {
        console.log('\n==================================================')
        console.log(`\nFlow worker inicializado`)
    })

    playwrightFlowWorker.on('completed', async (job) => {
        console.log(`Flow ${job.name} completado`)
        console.log('\n==================================================')
    })

    playwrightFlowWorker.on('failed', (job, err) => {
        console.log(`\nFlow ${job?.name} falló`)
        console.error(err.message)
    })

    playwrightFlowWorker.on('error', (err) => {
        console.log('Error en Flow worker...')
        console.error(err)
    })

    process.on('SIGINT', async () => {
        await playwrightFlowWorker.close()
    })
}
FlowWorker()

async function QueueWorker() {
    //? Main
    const playwrightQueueWorker = new Worker('playwright-queue',
        async (job) => {
            console.log(`Job ${job.id} inicializado`)

            //? Execution
            const { bill, radicacionCodes }: JobDataType['data'] = job.data
            const context = await newContext(browser)
            const page = await context.newPage()

            const workflow = new HorisoesCoosaludWorkflow(context, page, bill, radicacionCodes)
            await workflow.run()
            const billData = workflow.billData

            await context.close()

            //? Return
            const { files, ...processedBillData } = billData
            const processedBill: ProcessedBillType = processedBillData

            if (billData.status != 'SUCCESS') {
                await job.updateData({
                    ...job.data,
                    failedBill: processedBill
                })

                if (billData.status == 'NOT_FOUND') throw new UnrecoverableError(billData.message)

                throw new Error(billData.message)
            }

            return processedBill
        },
        {
            connection: {
                host: REDIS_HOST,
                port: 6379,
                password: REDIS_PASSWORD,
                maxRetriesPerRequest: null
            }, concurrency: 5
        }
    )

    //? Status
    playwrightQueueWorker.on('completed', async (job) => {
        console.log(`Job ${job.id} completado`)
    })

    playwrightQueueWorker.on('failed', (job, err) => {
        console.log(`\nJob ${job?.id} falló: ${err.message}`)
        console.error(err)
    })

    playwrightQueueWorker.on('error', (err) => {
        console.log('Error en Queue worker...')
        console.error(err)
    })

    process.on('SIGINT', async () => {
        await playwrightQueueWorker.close()
    })
}
QueueWorker()

//==================================================================

process.on('SIGINT', async () => {
    console.log('\nCerrando Workers...')
    if (browser && browser.isConnected()) {
        await browser.close()
    }
    process.exit(0)
})