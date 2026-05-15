import { asyncHandler } from '@/middlewares'
import { executionDataType, executionUpdateDataType } from './execution.types'
import * as executionService from './execution.service'

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

export const createExecution = asyncHandler(async (req, res) => {
    const data: executionDataType = req.body

    const execution = await executionService.createExecution(data)

    return res.json({
        message: `Ejecucion inicializada: ${execution.id} ${execution.started_at}`,
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