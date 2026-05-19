import prisma from '@/config/prisma'
import { executionDataType, executionUpdateDataType } from './execution.types'
import { formatExecutionDate, getDateTimeDiff } from '@/utils/dates'

export async function executions() {
    return (await prisma.executions.findMany()).map(({ started_at, finished_at, ...data }) => ({
        ...data,
        started_at: formatExecutionDate(started_at),
        finished_at: formatExecutionDate(finished_at),
        execution_time: getDateTimeDiff(started_at, finished_at)
    }))
}

export async function getExecution(id: string | undefined) {
    if (!id) return
    const execution = await prisma.executions.findUnique({
        where: {
            id
        }
    })
    if (execution) {
        const { started_at, finished_at, ...data } = execution
        return {
            ...data,
            started_at: formatExecutionDate(started_at),
            finished_at: formatExecutionDate(finished_at),
            execution_time: getDateTimeDiff(started_at, finished_at)
        }
    }
}

export async function createExecution(data: executionDataType) {
    const { epsCode, ipsCode, metadata } = data
    return await prisma.executions.create({
        data: {
            ipsCode,
            epsCode,
            statusId: 1,
            metadata,
            started_at: new Date()
        },
        include: {
            status: true
        }
    })
}

export async function finishExecution(id: string | undefined, data: executionUpdateDataType) {
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