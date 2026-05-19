import { UnrecoverableError, Worker } from 'bullmq'
import { playwrightQueue } from './queues'
import { Browser, BrowserContext } from 'playwright'
import { execPlaywright, newContext } from '../index'
import { EPSBots, IPSBots, REDIS_CONNECTION } from './config'
import * as executionService from '@/modules/Execution/execution.service'
import { BillDataType, JobDataType, ProcessedBillType, RadicacionCodesType } from '../types'

console.log('Worker running')

//==================================================================
//* Globals

let browser: Browser
let context: BrowserContext
let radicacionCodes: RadicacionCodesType = [
    {
        code: '510521_20260519_025315',
        contract: 'Subsidiado'
    },
    {
        code: '510342_20260517_014214',
        contract: 'Contributivo'
    }
]
let jobsCount = 0
let executionId = ''

async function browserManager() {
    browser = await execPlaywright()
    context = await newContext(browser)
}


//==================================================================
//* Main

console.log('\nRadicacion Codes: ', radicacionCodes)
console.log('Jobs count: ', jobsCount)
console.log('Execution Id: ', executionId, Boolean(executionId))

const playwrightWorker = new Worker('playwright-execution',
    async (job) => {
        console.log('\n=============================================')
        console.log(`\nJob ${job.id} inicializado`)
        jobsCount++

        //? Initialization  
        if (!browser || !browser.isConnected()) {
            await browserManager()
        }
        
        if (jobsCount >= 50) {
            await context.close()
            context = await newContext(browser)
            jobsCount = 0
        }

        //? Execution
        const { execution, bill, ipsCode, epsCode }: JobDataType = job.data
        let billData: BillDataType
        if (!executionId) executionId = execution

        const IPSBot = IPSBots.find(IPS => IPS.code === ipsCode)!.bot
        const EPSBot = EPSBots.find(EPS => EPS.code === epsCode)!.bot

        const page = await context.newPage()
        billData = await IPSBot(context, page, bill)
        billData = await EPSBot(context, page, billData, radicacionCodes)
        await page.close()

        if (billData.success && billData.contract && billData?.radicado) {
            const existsRadicado = radicacionCodes.find(radicado => radicado.code == billData.radicado)
            if (!existsRadicado) radicacionCodes.push({ code: billData.radicado, contract: billData.contract })
        }

        //? Return
        const { files, ...processedBillData } = billData
        const processedBill: ProcessedBillType = processedBillData

        if (billData.status != 'SUCCESS') {
            await job.updateData({
                ...job.data,
                failedBill: processedBill
            })
            if (billData.status == 'NOT_FOUND') throw new UnrecoverableError(billData.message)
            throw new Error('Error al procesar factura')
        }

        return processedBill
    },
    { connection: REDIS_CONNECTION, concurrency: 1 }
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

playwrightWorker.on('failed', (job, err) => {
    console.log(`\nJob ${job?.id}: ${job?.name} falló`)
    console.error(err.message)
})

playwrightWorker.on('drained', async () => {
    const activeJobs = await playwrightQueue.getActiveCount()
    const waitingJobs = await playwrightQueue.getWaitingCount()

    if (activeJobs == 0 && waitingJobs == 0 && browser && browser.isConnected()) {
        await browser.close()

        const failedBills: ProcessedBillType[] = (await playwrightQueue.getFailed()).map(job => job.data?.failedBill)
        const successBills: ProcessedBillType[] = (await playwrightQueue.getCompleted()).map(job => job.returnvalue)
        const successLen = successBills.length
        const failedLen = failedBills.length

        const metadata = {
            total_facturas: successLen + failedLen,
            total_radicadas: successLen,
            total_fallidas: failedLen,
            pre_radicados: radicacionCodes.map(radicado => {
                const radicadoBills = successBills.filter(bill => bill.radicado == radicado.code)
                return {
                    codigo: radicado.code,
                    contrato: radicado.contract,
                    facturas: radicadoBills.map(bill => bill.bill),
                    cantidad_facturas: radicadoBills.length
                }
            }),
            fallidas: {
                codigos: failedBills.map(bill => bill.bill),
                facturas: failedBills
            }
        }

        await executionService.finishExecution(executionId, { metadata })
        console.log('\nWorker finalizado')
    }
})

playwrightWorker.on('error', (err) => {
    console.error(err)
})

process.on('SIGINT', async () => {
    console.log('\nCerrando worker...')

    if (browser && browser.isConnected()) {
        await browser.close()
    }
    await playwrightWorker.close()
    process.exit(0)
})
//==================================================================