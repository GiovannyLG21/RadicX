import { Worker } from 'bullmq'
import { Browser, BrowserContext } from 'playwright'
import { execPlaywright, newContext } from '../index'
import * as executionService from '@/modules/Execution/execution.service'
import { EPSBots, IPSBots, REDIS_CONNECTION } from './config'
import { BillDataType, JobDataType, ProcessedBillType, RadicacionCodesType } from '../types'
import { playwrightQueue } from './queues'

console.log('Worker running')

//==================================================================

let browser: Browser
let context: BrowserContext
let executionId = ''
let radicacionCodes: RadicacionCodesType

let successBills: ProcessedBillType[] = []
let failedBills: ProcessedBillType[] = []

const main = async () => {
    browser = await execPlaywright()
    context = await newContext(browser)
}

//==================================================================

//* Main

const playwrightWorker = new Worker('playwright-execution',
    async (job) => {
        // Initialization
        console.log(`\nJob ${job.id} inicializado`)
        if (!browser || !browser.isConnected()) {
            await main()
        }

        // Exec
        const { execution, bill, ipsCode, epsCode }: JobDataType = job.data
        executionId = execution

        const IPSBot = IPSBots.find(IPS => IPS.code === ipsCode)!.bot
        const EPSBot = EPSBots.find(EPS => EPS.code === epsCode)!.bot

        const billData = await IPSBot(context, bill)
        radicacionCodes = await EPSBot(context, billData, radicacionCodes)

        // Return
        const { files, ...data } = billData
        const processedBill = {
            ...data,
            files: files.map(({ buffer, ...fileInfo }) => fileInfo)
        }        
        if (!billData.success) failedBills.push(processedBill)
        if (billData.success) successBills.push(processedBill)

        return processedBill
    },
    {
        connection: REDIS_CONNECTION
    }
)

//==================================================================

//* Status

playwrightWorker.on('active', async (job) => {
    console.log(`\nWorker inicializado en Job ${job?.id}`)
})

playwrightWorker.on('completed', async (_job, result) => {
    console.log(result)
    console.log(`Job completado`)
})

playwrightWorker.on('drained', async () => {
    const activeJobs = (await playwrightQueue.getActive()).length
    const waitingJobs = (await playwrightQueue.getWaiting()).length
    if (activeJobs == 0 && waitingJobs == 0 && browser) {
        await browser.close()
        const metadata = {
            cantidad_facturas: successBills.length,
            facturas: {
                exitosas: {
                    codigos: successBills.map(bill => bill.bill),
                    facturas: successBills,
                },
                fallidas: {
                    codigos: failedBills.map(bill => bill.bill),
                    facturas: failedBills
                }
            }
        }
        await executionService.finishExecution(executionId, { metadata })
        successBills = []
        failedBills = []
        executionId = ''
    }
})

playwrightWorker.on('failed', (job, err) => {
    console.log(`\nJob ${job?.id}: ${job?.name} falló`)
    console.error(err.message)
})

playwrightWorker.on('error', (err) => {
    console.error(err)
})

//==================================================================