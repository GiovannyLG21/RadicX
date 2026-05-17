import { getDateTime } from '@/utils/dates';
import { asyncHandler } from '@/middlewares'
import { EPSBots, IPSBots } from '@/Bot/config/config'
import * as IPSService from '@/modules/IPS/ips.service'
import * as EPSService from '@/modules/EPS/eps.service'
import * as executionService from './execution.service'
import { BillsCodesType, executionDataType, executionUpdateDataType } from './execution.types'
import { playwrightQueue } from '@/Bot/config/queues'
import { BulkJobOptions } from 'bullmq';

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
        data: any;
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
            jobId: `${index + 1} ${bill}`,
            attempts: 3,
            backoff: {
                type: 'fixed',
                delay: 2000
            },
            removeOnComplete: true,
            removeOnFail: true
        }
    }))

    await playwrightQueue.obliterate({ force: true })
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