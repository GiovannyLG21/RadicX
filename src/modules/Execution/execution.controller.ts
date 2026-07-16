import fs from 'fs'
import crypto from 'crypto'
import { asyncHandler } from '@/middlewares'
import { execPlaywright, newContext } from '@/Bot/config/browser'
import { formatDate, getDateTime } from '@/utils/dates'
import { ExecutionDataType } from './execution.types'
import { HorisoesCoosaludMetadataType } from '@/Bot/types'
import * as executionService from './execution.service'
import { HorisoesCoosaludServices } from '@/Bot/Workflows/horisoes-coosalud.workflow'
import { HorisoesCoosaludScheduler } from '@/Bot/config/queues'
import CooSaludBot from '@/Bot/EPS/CooSalud'

//* Main
export const executions = asyncHandler(async (_req, res) => {
    const allExecutions = await executionService.executions()

    if (!allExecutions.length) return res.json({
        message: 'No se encontraron ejecuciones',
        status: 200
    })

    return res.json({
        message: 'Ejecuciones encontradas',
        data: allExecutions,
        status: 200
    })
})

export const getExecution = asyncHandler(async (req, res) => {
    const { id } = req.params

    const execution = await executionService.getExecution(id)
    if (!execution) return res.status(404).json({
        message: 'No se encontro ninguna ejecucion con el codigo proporcionado',
        status: 404
    })

    return res.json({
        message: 'Ejecucion encontrada',
        data: execution,
        status: 200
    })
})

//* Tests
/**
 * Endpoint para la ejecucion de **tests**.
 */
export const Test = asyncHandler(async (req, res) => {

    const ipsCode = '901749264'
    const epsCode = 'EPS042'

    const data = await executionService.getLastExecutions(ipsCode, epsCode)

    return res.json({
        message: 'Executed',
        length: data.length,
        data,
        status: 200
    })
})

// TestAddJobSchedule
export const TestAddJobSchedule = asyncHandler(async (req, res) => {

    await HorisoesCoosaludScheduler.obliterate({ force: true })
    await HorisoesCoosaludScheduler.add(
        'check-preradicados-job',
        {},
        {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 3000
            },
            removeOnComplete: false,
            removeOnFail: false

        }
    )

    return res.json({
        message: 'Executed',
        status: 200
    })
})

//TestHorisoesCoosaludRadicadoCertificate
export const TestHorisoesCoosaludRadicadoCertificate = asyncHandler(async (req, res) => {

    const browser = await execPlaywright()
    const context = await newContext(browser)
    const page = await context.newPage()

    const HorisoesCoosaludService = new HorisoesCoosaludServices()
    const EPSService = HorisoesCoosaludService.EPSServices(context, page)

    const radicado = 'RAD-525920_20260603_095449'
    const radicadoCertificate = await EPSService.getRadicadoCertificate(radicado)
    if (radicadoCertificate) {
        fs.writeFileSync(radicadoCertificate?.filename, radicadoCertificate?.buffer)
    }

    return res.json({
        message: 'Executed',
        data: radicadoCertificate?.filename,
        status: 200
    })
})

//TestHorisoesCoosaludScheduler
export const TestHorisoesCoosaludScheduler = asyncHandler(async (req, res) => {

    const browser = await execPlaywright()
    const context = await newContext(browser)
    const page = await context.newPage()

    const HorisoesCoosaludService = new HorisoesCoosaludServices()
    const EPSService = HorisoesCoosaludService.EPSServices(context, page)

    // Single
    const preRadicado = '560355_20260715_201447'
    const preRadicadoData = await EPSService.getPreRadicadoData(preRadicado, 'PENTAVALENTE', 2)
    if (!preRadicadoData) throw new Error('')
    await HorisoesCoosaludService.insertPreRadicadoData(preRadicadoData)

    // Multiple
    // const preRadicados = await HorisoesCoosaludService.getPreRadicadosCreated()    
    // const preRadicadosData = await EPSService.getPreRadicadosData(preRadicados)
    // if (!preRadicadosData) return res.status(500).json({ message: EPSService.message })

    // const updatePreRadicados = await HorisoesCoosaludService.updatePreRadicadosFile(preRadicadosData)
    // if (!updatePreRadicados) return res.status(500).json({ message: HorisoesCoosaludService.message })

    // const createRadicadosSheet = await HorisoesCoosaludService.createRadicadosSheet(updatePreRadicados)
    // if (!createRadicadosSheet) return res.status(500).json({ message: HorisoesCoosaludService.message })

    // const uploadRadicadoFiles = await HorisoesCoosaludService.updateRadicadosFolder(context, page, updatePreRadicados)
    // if (!uploadRadicadoFiles) return res.status(500).json({ message: HorisoesCoosaludService.message })

    await browser.close()

    return res.json({
        message: 'Executed',
        data: preRadicadoData,
        status: 200
    })
})

//* Bots

//? HorisoesCoosalud
/**
 * Ejecucion principal de workflow del **'IPS Bot Horisoes'** y el **'EPS Bot Coosalud'**.
 */
export const HorisoesCoosaludExecution = asyncHandler(async (req, res) => {
    const bills: string[] = req.body.bills
    const { workflow, service }: ExecutionDataType = req.body
    const { ipsCode, epsCode } = workflow

    //* Available Execution
    const lastExecutions = await executionService.getLastExecutions(ipsCode, epsCode, 4)
    if (lastExecutions.length) {
        const rangSupDate = new Date()
        const rangInfDate = new Date()
        rangInfDate.setHours(rangSupDate.getHours() - 6)

        const maxExecuted = lastExecutions.every(execution => {
            const executionDate = execution.started_at
            return executionDate && executionDate >= rangInfDate && executionDate <= rangSupDate
        })

        if (maxExecuted) return res.status(409).json({
            message: 'Solo se pueden realizar 4 ejecuciones cada 6 horas. Por favor espere para realizar mas.',
            status: 409
        })
    }

    //* Workflow run initiator | Creation of flow and jobs
    const WorkflowInitiator = new workflow.initiator(bills, service)
    await WorkflowInitiator.run()

    if (!WorkflowInitiator.success) return res.status(WorkflowInitiator.status).json({
        message: `Error al ejecutar el workflow: ${WorkflowInitiator.message}`,
        status: WorkflowInitiator.status
    })

    const execution = WorkflowInitiator.execution

    return res.json({
        message: `Ejecucion inicializada: ${execution?.id} - ${getDateTime(execution?.started_at)}`,
        data: {
            id: execution?.id,
            ipsCode,
            epsCode,
            status: execution?.status.name,
            started_at: execution?.started_at,
            process: {
                bills
            }
        },
        status: 200
    })
})

/**
 * Verificacion del estado de los servicios del workflow.
 */
export const HorisoesCoosaludHealth = asyncHandler(async (req, res) => {
    const { workflow }: ExecutionDataType = req.body

    const browser = await execPlaywright()
    const context = await newContext(browser)

    const WorkflowInitiator = workflow.initiator
    const servicesStatus = await WorkflowInitiator.servicesHealthCheck(context)

    await browser.close()

    if (!servicesStatus.success) return res.status(500).json({
        message: servicesStatus.message,
        status: 500
    })

    return res.json({
        message: 'Horisoes-Coosalud services operating properly.',
        status: 200
    })
})

/**
 * Endpoint para obtener todas las facturas procesadas y fallidas hasta la fecha; 
 * incluye pre-radicados y las facturas subidas en ellos.
 */
export const HorisoesCoosaludProccesed = asyncHandler(async (req, res) => {
    const { workflow }: ExecutionDataType = req.body
    const { ipsCode, epsCode } = workflow
    const processedStructure: {
        total_procesadas: number,
        total_fallidas: number,
        pre_radicados: string[],
        procesadas: {
            pre_radicado: string,
            contrato: string,
            cantidad_facturas: number
            facturas: string[],
        }[]
        fallidas: string[]
    } = {
        total_procesadas: 0,
        total_fallidas: 0,
        pre_radicados: [],
        procesadas: [],
        fallidas: []
    }
    const processedStructureFaileds: string[] = []

    const executions = await executionService.getExecutions(ipsCode, epsCode)
    for (const execution of executions) {
        const metadata = execution.metadata as unknown as HorisoesCoosaludMetadataType

        // Total procesadas
        processedStructure.total_procesadas += metadata.total_facturas

        for (const pre_radicado of metadata.pre_radicados) {
            // Pre_radicados
            const existPreradicado = processedStructure.pre_radicados.includes(pre_radicado.codigo)
            if (!existPreradicado) processedStructure.pre_radicados.push(pre_radicado.codigo)

            // Procesadas
            const findPreradicado = processedStructure.procesadas.find(procesada => procesada.pre_radicado == pre_radicado.codigo)
            if (findPreradicado) {
                findPreradicado.cantidad_facturas += pre_radicado.cantidad_facturas
                for (const factura of pre_radicado.facturas) findPreradicado.facturas.push(factura)
                continue
            }
            processedStructure.procesadas.push({
                pre_radicado: pre_radicado.codigo,
                contrato: pre_radicado.contrato,
                cantidad_facturas: pre_radicado.cantidad_facturas,
                facturas: pre_radicado.facturas
            })
        }

        // Fallidas
        for (const fallida of metadata.fallidas.codigos) {
            if (processedStructure.fallidas.includes(fallida)) continue
            processedStructure.total_fallidas += 1
            processedStructure.fallidas.push(fallida)
        }
    }

    // Encontrar fallidas cargadas
    for (const failedBill of processedStructure.fallidas) {
        let failedBillProcessed = false
        for (const processed of processedStructure.procesadas) {
            failedBillProcessed = processed.facturas.includes(failedBill)
            if (failedBillProcessed) {
                processedStructure.total_fallidas -= 1
                break
            }
        }
        if (!failedBillProcessed) processedStructureFaileds.push(failedBill)
    }

    processedStructure.fallidas = processedStructureFaileds

    return res.json({
        message: `Ejecuciones IPS-${ipsCode} EPS-${epsCode}`,
        data: processedStructure,
        status: 200
    })
})

/**
 * Endpoint para añadir un job al scheduler.
 */
export const HorisoesCoosaludSchedulerEx = asyncHandler(async (req, res) => {

    await HorisoesCoosaludScheduler.add(
        'check-preradicados-job',
        {},
        {
            jobId: `horisoes_coosalud_manual_repeteable_job_${crypto.randomInt(1000000000000, 9999999999999)}`,
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 3000
            },
            removeOnComplete: false,
            removeOnFail: false
        }
    )

    return res.json({
        message: 'Horisoes-Coosalud Scheduler added.',
        status: 200
    })
})

export const HorisoesCoosaludUpdateRads = asyncHandler(async (req, res) => {
    const browser = await execPlaywright()
    const context = await newContext(browser)
    const page = await context.newPage()

    const login = await new CooSaludBot(context, page).login()
    if (!login) return res.status(500).json({
        error: 'Login error',
        status: 500
    })

    const ipsCode = '901749264'
    const epsCode = 'EPS042'
    const executions = await executionService.getExecutions(ipsCode, epsCode, 120)

    // Navigation
    await page.goto('https://vco.ctamedicas.com/app/radicaciones')

    const initDate = '2026-01-01'
    const actualDate = formatDate(new Date(), 'REVERSED')
    //Set 'Filtro Fecha'
    await page.locator('#filterBy').selectOption('radicacion.creacion_fecha')
    // Set 'Fecha Inicio'
    await page.locator('#fechaIni').fill(initDate)
    // Set 'Fecha Fin'
    await page.locator('#fechaFin').fill(actualDate)
    // Button 'Consultar'
    await page.locator('#btBolsaSearchRads').click()
    // Table search
    const tableSearchInput = page.locator('#tablaRadicaciones_filter input')

    // Search
    for (const execution of executions) {
        const metadata = execution.metadata as unknown as HorisoesCoosaludMetadataType
        for (const preRadicado of metadata.pre_radicados) {
            await tableSearchInput.fill('')
            await tableSearchInput.fill(preRadicado.codigo)
            const searchRow = page.locator('#tablaRadicaciones tbody tr').first()
            const statusColumn = await searchRow.locator('td').nth(10).textContent()
            console.log(`${preRadicado.codigo} - ${statusColumn}`)

            preRadicado.radicado = statusColumn !== null && statusColumn === 'RADICADA'
        }
        await executionService.updateExecutionMetadata(execution.id, metadata)
    }

    await browser.close()

    return res.json({
        message: 'Estado de preradicados existentes actualizado',
        data: executions,
        status: 200
    })
})