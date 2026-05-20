import { getDateTime } from '@/utils/dates';
import { asyncHandler } from '@/middlewares'
import { EPSBots, IPSBots } from '@/Bot/config/config'
import * as IPSService from '@/modules/IPS/ips.service'
import * as EPSService from '@/modules/EPS/eps.service'
import * as coosaludService from '@/Bot/EPS/CooSalud/coosalud.service'
import * as executionService from './execution.service'
import { BillsCodesType, executionDataType, executionUpdateDataType } from './execution.types'
import { playwrightQueue } from '@/Bot/config/queues'
import { BulkJobOptions } from 'bullmq';
import { JobDataType } from '@/Bot/types';
import NuevaEPSBot from '@/Bot/EPS/NuevaEPS'

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

    //* Find IPS/EPS Bot
    const IPSReference = IPSBots.find(IPS => IPS.code === ipsCode)
    const EPSReference = EPSBots.find(EPS => EPS.code === epsCode)
    if (!IPSReference || !EPSReference) return res.status(409).json({
        message: !IPSReference ? 'No se encontro el flujo de la IPS' : 'No se encontro el flujo de la EPS',
        status: 409
    })

    //* Create execution
    const execution = await executionService.createExecution({ ipsCode, epsCode, metadata })
    const { id, status, started_at } = execution

    //* Bills
    const billsFormat: {
        name: string;
        data: JobDataType;
        opts?: BulkJobOptions;
    }[] = bills.map((bill, index) => ({
        name: `process-bill-${bill}`,
        data: {
            execution: id,
            bill,
            ipsCode,
            epsCode
        },
        opts: {
            jobId: `${index + 1}_${bill}`,
            attempts: 3,
            backoff: {
                type: 'fixed',
                delay: 2000
            },
            removeOnComplete: false,
            removeOnFail: false
        }
    }))

    // Clean previous processed jobs
    await playwrightQueue.clean(0, 5000, 'completed')
    await playwrightQueue.clean(0, 5000, 'failed')

    //* Add to Queue
    await playwrightQueue.addBulk(billsFormat)

    return res.json({
        message: `Ejecucion inicializada: ${execution.id} - ${getDateTime(execution.started_at)}`,
        data: {
            id,
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

export const finishExecution = asyncHandler(async (req, res) => {
    const { id } = req.params
    const data: executionUpdateDataType = req.body

    const findExecution = await executionService.getExecution(id)
    if (!findExecution) return res.status(404).json({
        message: 'No se encontro la ejecucion',
        status: 404
    })

    const execution = await executionService.finishExecution(id, data)

    return res.json({
        message: `Ejecucion finalizada exitosamente: ${id} - ${execution?.finished_at}`,
        status: 200
    })
})

export const createMetadata = asyncHandler(async (req, res) => {
    const { id } = req.params

    const radicadoFiles = await coosaludService.getSftpFiles(id)
    if (!radicadoFiles) return res.status(400).json({
        message: 'Ha habido un error al obtener la carpeta',
        status: 400
    })

    const metadata: executionUpdateDataType["metadata"] = {
        total_facturas: 0,
        total_radicadas: radicadoFiles.length,
        total_fallidas: 0,
        pre_radicados: [
            {
                codigo: '',
                contrato: 'Subsidiado',
                facturas: radicadoFiles,
                cantidad_facturas: radicadoFiles.length
            }
        ],
        fallidas: {
            codigos: [],
            facturas: []
        }
    }

    return res.json({
        message: 'Metadata created',
        data: metadata,
        status: 200
    })
})

export const getProcessed = asyncHandler(async (req, res) => {
    const { radicados } = req.body
    const processedBills = await coosaludService.getAllSftpFiles(radicados)
    const executionsMetadata = (await executionService.executions()).map(execution => JSON.stringify(execution.metadata))

    const totalRadicadas = processedBills?.map(radicado => radicado.total_facturas).reduce((acc, currentValue) => acc + currentValue)
    const totalProcesadas = executionsMetadata.map(metadata => JSON.parse(metadata)?.total_facturas).reduce((acc, currentValue) => acc + currentValue)
    const totalFallidasCant = executionsMetadata.map(metadata => JSON.parse(metadata)?.total_fallidas).reduce((acc, currentValue) => acc + currentValue)
    const facturasFallidas = executionsMetadata.map(metadata => JSON.parse(metadata)?.fallidas?.codigos).flat(1)

    return res.json({
        total_procesadas: totalProcesadas,
        total_radicadas: totalRadicadas,
        total_fallidas: totalFallidasCant,
        fallidas: facturasFallidas,
        processedBills,
    })
})

export const NuevaEPS = asyncHandler(async (req, res) => {

    await NuevaEPSBot()

    return res.json({
        message: 'Bot ejecutado'
    })
})