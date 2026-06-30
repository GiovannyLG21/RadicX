import { HorisoesCoosaludServices } from '@/Bot/Workflows/horisoes-coosalud.workflow'
import { UnrecoverableError, Worker } from 'bullmq'
import { HorisoesCoosaludFlowQueue, HorisoesCoosaludQueue } from './config/queues'
import { Browser } from 'playwright'
import { execPlaywright, newContext } from './config/browser'
import { HorisoesCoosaludWorkflow } from './Workflows/horisoes-coosalud.workflow'
import { REDIS_HOST, REDIS_PASSWORD } from '@/config/env'
import { getDataFromEntries } from '@/utils/objects'
import { JobDataType, ProcessedBillType, RadicacionCodesType } from './types'
import * as executionService from '@/modules/Execution/execution.service'
import { formatDate } from '@/utils/dates'

console.log('\nWorkers running!')
console.log('==================================================')
console.log('\n')

// Performance Log
setInterval(() => {
    const m = process.memoryUsage()

    console.log({
        rss: Math.round(m.rss / 1024 / 1024),
        heapUsed: Math.round(m.heapUsed / 1024 / 1024),
        heapTotal: Math.round(m.heapTotal / 1024 / 1024),
        external: Math.round(m.external / 1024 / 1024),
        arrayBuffers: Math.round(m.arrayBuffers / 1024 / 1024),
    })
}, 3600000)

//* Globals
let browser: Browser
async function browserManager() {
    browser = await execPlaywright()
}
browserManager()

//==================================================================

//* Horisoes_Coosalud_Workers
async function HorisoesCoosaludFlowWorker() {
    //? Func
    const getFailedBills = async (billsIds: string[]): Promise<ProcessedBillType[]> => {
        return await Promise.all(
            billsIds.map(async (id) => {
                const billId = id.replace('bull:horisoes_coosalud_queue:', '')
                return (await HorisoesCoosaludQueue.getJob(billId))?.data?.failedBill
            })
        )
    }
    //? Worker
    const playwrightFlowWorker = new Worker('horisoes_coosalud_flow',
        async (job) => {
            // Browser
            const context = await newContext(browser)
            const page = await context.newPage()
            // Const
            const HorisoesCoosaludService = new HorisoesCoosaludServices()
            const EPSService = HorisoesCoosaludService.EPSServices(context, page)
            const { executionId, radicacionCodes }: { executionId: string, radicacionCodes: RadicacionCodesType } = job.data
            const { processed, ignored } = await job.getDependencies()

            if (!executionId) return
            
            // Success & Failed Bills
            const successBills: ProcessedBillType[] = getDataFromEntries(processed, 1)
            const successLen = successBills.length
            // ---
            const failedBillsIds: string[] = getDataFromEntries(ignored, 0)
            const failedBills: ProcessedBillType[] = await getFailedBills(failedBillsIds)
            const failedLen = failedBills.length

            // Get preradicado bills & update excel file (with preradicado info).
            const preRadicados = []
            for (const preRadicado of radicacionCodes) {
                const preRadicadoBills = successBills.filter(bill => bill.radicado == preRadicado.code)
                //! Pendiente manejo de errores
                const preRadicadoData = await EPSService.getPreRadicadoData(preRadicado.code, preRadicadoBills.length)
                if (preRadicadoData) await HorisoesCoosaludService.insertPreRadicadoData(preRadicadoData)

                preRadicados.push({
                    codigo: preRadicado.code,
                    contrato: preRadicado.contract,
                    facturas: preRadicadoBills.map(bill => bill.bill),
                    cantidad_facturas: preRadicadoBills.length
                })
            }

            // Create metadata
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

            await executionService.finishExecution(executionId, { metadata })

            await context.close()

            // Clean browser
            const waitingFlows = await HorisoesCoosaludFlowQueue.getWaitingCount()
            const waitingChildrenFlows = await HorisoesCoosaludFlowQueue.getWaitingChildrenCount()
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
HorisoesCoosaludFlowWorker()

async function HorisoesCoosaludQueueWorker() {
    //? Worker
    const playwrightQueueWorker = new Worker('horisoes_coosalud_queue',
        async (job) => {
            console.log(`Job ${job.id} inicializado`)
            // Browser
            const context = await newContext(browser)
            const page = await context.newPage()
            // Const
            const { service, radicacionCodes, bill }: JobDataType['data'] = job.data
            const workflow = new HorisoesCoosaludWorkflow(context, page, service, radicacionCodes, bill)

            // Execution            
            const billData = await workflow.run()
            await context.close()

            // Return
            const { radicado, contract, success, status, message } = billData
            const processedBill: ProcessedBillType = {
                bill,
                service,
                radicado: radicado ?? '',
                contract,
                success,
                status,
                message,
            }

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
HorisoesCoosaludQueueWorker()

async function HorisoesCoosaludSchedulerWorker() {
    //? Worker
    const SchedulerWorker = new Worker('horisoes_coosalud_scheduler',
        async (job) => {
            const actualDate = formatDate(new Date())
            console.log(`Job ${job.id}_${actualDate} inicializado\n`)
            const setFail = async (message: string | undefined) => {
                await job.updateData({
                    ...job.data,
                    failedSchedule: {
                        date: actualDate,
                        success: false,
                        status: 'FAILED',
                        message: message ?? '',
                        progress: jobProgress
                    }
                })
                throw new Error(message)
            }
            // Browser
            const context = await newContext(browser)
            const page = await context.newPage()
            // Services
            const HorisoesCoosaludService = new HorisoesCoosaludServices()
            const EPSService = HorisoesCoosaludService.EPSServices(context, page)
            // Const
            type taskStatusType = 'WAITING' | 'IN PROCESS' | 'COMPLETED'
            type taskDataType = unknown | null
            const jobProgress: {
                preRadicados: string[] | null
                preRadicadosData: {
                    status: taskStatusType
                    data: taskDataType
                }
                updatePreRadicados: {
                    status: taskStatusType
                    data: taskDataType
                }
                createRadicadosSheet: {
                    status: taskStatusType
                    data: taskDataType
                }
                uploadRadicadoFiles: {
                    status: taskStatusType
                    data: taskDataType
                }
            } = {
                preRadicados: null,
                preRadicadosData: {
                    status: 'WAITING',
                    data: null
                },
                updatePreRadicados: {
                    status: 'WAITING',
                    data: null
                },
                createRadicadosSheet: {
                    status: 'WAITING',
                    data: null
                },
                uploadRadicadoFiles: {
                    status: 'WAITING',
                    data: null
                }
            }
            await job.updateProgress(jobProgress)

            //* Services Health
            const servicesStatus = await HorisoesCoosaludService.servicesHealthCheck(context)
            if (!servicesStatus.success) return await setFail(servicesStatus.message)

            //* Preradicados
            const preRadicados = await HorisoesCoosaludService.getPreRadicadosCreated()
            jobProgress.preRadicados = preRadicados
            await job.updateData({
                date: actualDate,
                status: 'RUNNING',
                initialData: preRadicados
            })
            await job.updateProgress(jobProgress)
            console.log('Preradicados obtained ✓')

            //* PreRadicadosData
            jobProgress.preRadicadosData.status = 'IN PROCESS'
            await job.updateProgress(jobProgress)
            const preRadicadosData = await EPSService.getPreRadicadosData(preRadicados)
            if (!preRadicadosData) return await setFail(EPSService.message)
            jobProgress.preRadicadosData.status = 'COMPLETED'
            jobProgress.preRadicadosData.data = preRadicadosData
            await job.updateProgress(jobProgress)
            console.log('Preradicados data downloaded ✓')

            //* updatePreRadicadosFile
            jobProgress.updatePreRadicados.status = 'IN PROCESS'
            await job.updateProgress(jobProgress)
            const updatePreRadicados = await HorisoesCoosaludService.updatePreRadicadosFile(preRadicadosData)
            if (!updatePreRadicados) return await setFail(HorisoesCoosaludService.message)
            jobProgress.updatePreRadicados.status = 'COMPLETED'
            jobProgress.updatePreRadicados.data = updatePreRadicados
            await job.updateProgress(jobProgress)
            console.log('Preradicados file updated ✓')

            //* createRadicadosSheet
            jobProgress.createRadicadosSheet.status = 'IN PROCESS'
            await job.updateProgress(jobProgress)
            const createRadicadosSheet = await HorisoesCoosaludService.createRadicadosSheet(updatePreRadicados)
            if (!createRadicadosSheet) return await setFail(HorisoesCoosaludService.message)
            jobProgress.createRadicadosSheet.status = 'COMPLETED'
            jobProgress.createRadicadosSheet.data = createRadicadosSheet
            await job.updateProgress(jobProgress)
            console.log('Radicados sheet created ✓')

            //* uploadRadicadoFiles
            jobProgress.uploadRadicadoFiles.status = 'IN PROCESS'
            await job.updateProgress(jobProgress)
            await job.updateData({
                ...job.data,
                progress: jobProgress
            })
            const uploadRadicadoFiles = await HorisoesCoosaludService.updateRadicadosFolder(context, page, updatePreRadicados)
            if (!uploadRadicadoFiles) return await setFail(HorisoesCoosaludService.message)
            jobProgress.uploadRadicadoFiles.status = 'COMPLETED'
            jobProgress.uploadRadicadoFiles.data = uploadRadicadoFiles
            console.log('\nRadicados files uploaded ✓')

            await context.close()

            //* Return
            await job.updateData({
                date: actualDate,
                status: 'COMPLETED',
                initialData: preRadicados
            })

            return {
                data: updatePreRadicados,
                progress: jobProgress
            }
        }, {
        connection: {
            host: REDIS_HOST,
            port: 6379,
            password: REDIS_PASSWORD,
            maxRetriesPerRequest: null
        },
        concurrency: 1
    })
    //? Status
    SchedulerWorker.on('completed', async (job) => {
        console.log(`\nJob ${job.id} completado`)
    })

    SchedulerWorker.on('failed', (job, err) => {
        console.log(`\nJob ${job?.id} falló: ${err.message}`)
        console.error(err)
    })

    SchedulerWorker.on('error', (err) => {
        console.log('Error en worker...')
        console.error(err)
    })

    process.on('SIGINT', async () => {
        await SchedulerWorker.close()
    })
}
HorisoesCoosaludSchedulerWorker()
//==================================================================

process.on('SIGINT', async () => {
    console.log('\nCerrando Workers...')
    if (browser && browser.isConnected()) {
        await browser.close()
    }
    process.exit(0)
})