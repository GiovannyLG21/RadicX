import * as IPSService from '@/modules/IPS/ips.service'
import * as EPSService from '@/modules/EPS/eps.service'
import * as coosaludService from '@/Bot/EPS/CooSalud/coosalud.service'
import * as executionService from './execution.service'
import { BillsCodesType, executionDataType, ExecutionMetadataType, GetRadicadosDataType } from './execution.types'
import { asyncHandler } from '@/middlewares'
import { getDateTime } from '@/utils/dates'
import { Workflows } from '@/Bot/config/config'
import CooSaludBot from '@/Bot/EPS/CooSalud'
import { execPlaywright, newContext } from '@/Bot'
import HorisoesBot from '@/Bot/IPS/Horisoes'

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

//* Main
export const createExecution = asyncHandler(async (req, res) => {
    const bills: BillsCodesType = req.body.bills
    const data: executionDataType = req.body
    const { ipsCode, epsCode, metadata } = data

    //* Find IPS/EPS
    const IPSData = await IPSService.getIPSByCode(ipsCode)
    const EPSData = await EPSService.getEPSByCode(epsCode)
    if (!IPSData || !EPSData) return res.status(404).json({
        message: !IPSData ? 'No se encontro la IPS proporcionada' : 'No se encontro la EPS proporcionada',
        status: 404
    })

    //* Find IPS/EPS Workflow
    const WorkflowReference = Workflows.find(flow => flow.ipsCode === ipsCode && flow.epsCode === epsCode)
    if (!WorkflowReference) return res.status(409).json({
        message: 'No se encontro el flujo de la IPS y EPS indicadas',
        status: 409
    })

    //* Create execution
    const execution = await executionService.createExecution({ ipsCode, epsCode, metadata })
    const { id: executionId, status, started_at } = execution

    //* Workflow run initiator | Creation of flow and jobs
    const WorkflowInitiator = new WorkflowReference.initiator(executionId, bills)
    await WorkflowInitiator.run()

    if (!WorkflowInitiator.success) return res.status(500).json({
        message: `Error al ejecutar el workflow: ${WorkflowInitiator.message}`,
        status: 500
    })

    return res.json({
        message: `Ejecucion inicializada: ${execution.id} - ${getDateTime(execution.started_at)}`,
        data: {
            id: executionId,
            ipsCode,
            epsCode,
            status: status.name,
            started_at,
            process: {
                bills
            }
        },
        status: 200
    })
})

/**
 * Endpoint para obtener todas las facturas procesadas y fallidas hasta la fecha; 
 * incluye pre-radicados y las facturas subidas en ellos.
 */
export const getAllProcessed = asyncHandler(async (req, res) => {
    const { epsCode, ipsCode }: GetRadicadosDataType = req.body

    //* Find IPS/EPS
    const IPSData = await IPSService.getIPSByCode(ipsCode)
    const EPSData = await EPSService.getEPSByCode(epsCode)
    if (!IPSData || !EPSData) return res.status(404).json({
        message: !IPSData ? 'No se encontro la IPS proporcionada' : 'No se encontro la EPS proporcionada',
        status: 404
    })

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

    const executions = await executionService.getExecutions(epsCode, ipsCode)

    for (const execution of executions) {
        const metadata = execution.metadata as ExecutionMetadataType

        // Total fallidas y procesadas
        processedStructure.total_procesadas += metadata.total_facturas
        processedStructure.total_fallidas += metadata.total_fallidas

        for (const pre_radicado of metadata.pre_radicados) {
            // Pre_radicados
            const existPreradicado = processedStructure.pre_radicados.find(codigo => codigo == pre_radicado.codigo)
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
        for (const fallida of metadata.fallidas.codigos) processedStructure.fallidas.push(fallida)
    }

    return res.json({
        message: `Ejecuciones IPS-${ipsCode} EPS-${epsCode}`,
        data: processedStructure,
        status: 200
    })
})

/**
 * Endpoint para obtener todos los pre-radicados (carpetas) creados en el sftp
 */
export const getCreatedRadicados = asyncHandler(async (req, res) => {
    const { epsCode, ipsCode }: GetRadicadosDataType = req.body

    //* Find IPS/EPS
    const IPSData = await IPSService.getIPSByCode(ipsCode)
    const EPSData = await EPSService.getEPSByCode(epsCode)
    if (!IPSData || !EPSData) return res.status(404).json({
        message: !IPSData ? 'No se encontro la IPS proporcionada' : 'No se encontro la EPS proporcionada',
        status: 404
    })

    // Get all executions
    const executions = await executionService.getExecutions(epsCode, ipsCode)

    // Get pre-radicados codes
    const pre_radicados = [... new Set(
        executions.map(execution => {
            const metadata = execution.metadata as ExecutionMetadataType
            const codes = metadata.pre_radicados.map(pre_radicado => pre_radicado.codigo)
            return codes
        }).flat(1)
    )]

    // const browser = await execPlaywright()
    // const context = await newContext(browser)
    // const page = await context.newPage()
    // const CooSalud = new CooSaludBot(context, page)
    // await CooSalud.getRadicado('510347_20260517_033156')

    return res.json({
        message: 'Radicaciones obtenidas',
        data: pre_radicados,
        status: 200
    })
})

/**
 * Endpoint para obtener todas las facturas cargadas en una carpeta en el sftp
 * @param {string} code Codigo del pre-radicado (carpeta).
 */
export const getRadicadoBills = asyncHandler(async (req, res) => {
    const { code } = req.params

    const loadedBills = await coosaludService.getSftpFiles(code)
    if (!loadedBills) return res.status(400).json({
        message: 'No se encontro una carpeta con el codigo proporcionado',
        status: 400
    })

    return res.json({
        message: 'Facturas encontradas',
        data: {
            pre_radicado: code,
            total_facturas: loadedBills.length,
            facturas: loadedBills
        },
        status: 200
    })
})

export const Test = asyncHandler(async (req, res) => {

    const browser = await execPlaywright()
    const context = await newContext(browser)
    const page = await context.newPage()

    const EPS = new CooSaludBot(context, page)
    const IPS = new HorisoesBot(context, page, '')

    const data = await EPS.getPreRadicadoData('503194_20260508_213521', 123)
    if (data) await IPS.updatePreRadicadoFile(data)

    await browser.close()

    return res.json({
        message: 'Executed',
        data,
        status: 200
    })
})