import prisma from '@/config/prisma'
import { formatExecutionDate, getDateTimeDiff } from '@/utils/dates'
import { CreateExecutionDataType, FinishExecutionDataType } from './execution.types'

export async function executions() {
    return (await prisma.executions.findMany({
        include: {
            status: true
        }
    })).map(({ status, started_at, finished_at, metadata, ...data }) => ({
        ...data,
        status: status.name,
        started_at: formatExecutionDate(started_at),
        finished_at: formatExecutionDate(finished_at),
        execution_time: getDateTimeDiff(started_at, finished_at),
        metadata
    }))
}

export async function getExecution(id: string | undefined) {
    if (!id) return
    const execution = await prisma.executions.findUnique({
        where: { id },
        include: {
            status: true
        }
    })
    if (execution) {
        const { status, started_at, finished_at, metadata, ...data } = execution
        return {
            ...data,
            status: status.name,
            started_at: formatExecutionDate(started_at),
            finished_at: formatExecutionDate(finished_at),
            execution_time: getDateTimeDiff(started_at, finished_at),
            metadata
        }
    }
}

export async function createExecution(data: CreateExecutionDataType) {
    const { epsCode, ipsCode } = data
    return await prisma.executions.create({
        data: {
            ipsCode,
            epsCode,
            statusId: 1,
            metadata: {},
            started_at: new Date()
        },
        include: {
            status: true
        }
    })
}

export async function updateExecutionMetadata(id: string | undefined, metadata: object) {
    if (!id) return
    return await prisma.executions.update({
        where: {
            id
        },
        data: {
            metadata
        }
    })
}

export async function finishExecution(id: string | undefined, data: FinishExecutionDataType) {
    if (!id) return
    const { metadata } = data
    return await prisma.executions.update({
        where: {
            id
        },
        data: {
            statusId: 2,
            metadata,
            finished_at: new Date()
        }
    })
}

/**
 * Servicio para obtener las ejecuciones **finalizadas** del bot de determinada **IPS** y **EPS**.
 * @param ipsCode Codigo de la IPS
 * @param epsCode Codigo de la EPS
 * @param cant Cantidad de ejecuciones a obtener (opcional, **por defecto 100**).
 */
export async function getExecutions(ipsCode: string, epsCode: string, cant?: number) {
    return await prisma.executions.findMany({
        where: {
            statusId: 2,
            epsCode,
            ipsCode
        },
        orderBy: {
            started_at: 'desc'
        },
        take: cant ? cant : 100
    })
}

/**
 * Servicio para obtener las ejecuciones de los ultimos 14 dias (en orden descendente) **con cualquier estado** del bot de determinada **IPS** y **EPS**.
 * @param ipsCode Codigo de la IPS
 * @param epsCode Codigo de la EPS
 * @param cant Cantidad de ejecuciones a obtener (opcional, **por defecto 100**).
 */
export async function getLastExecutions(ipsCode: string, epsCode: string, cant?: number) {
    const weekDate = new Date()
    weekDate.setDate(weekDate.getDate() - 14)

    return await prisma.executions.findMany({
        where: {
            epsCode,
            ipsCode,
            started_at: {
                gte: weekDate
            }
        },
        orderBy: {
            started_at: 'desc'
        },
        take: cant ? cant : 100
    })
}