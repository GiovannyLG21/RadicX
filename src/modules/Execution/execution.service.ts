import prisma from '@/config/prisma'
import { formatExecutionDate, getDateTimeDiff } from '@/utils/dates'
import { executionDataType, executionUpdateDataType } from './execution.types'

export async function executions() {
    return (await prisma.executions.findMany({
        include: {
            status: true
        }
    })).map(({ status, statusId, started_at, finished_at, metadata, ...data }) => ({
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
        const { status, statusId, started_at, finished_at, metadata, ...data } = execution
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

export async function getExecutions(epsCode: string, ipsCode: string) {
    return await prisma.executions.findMany({
        where: {
            statusId: 2,
            epsCode,
            ipsCode
        }
    })
}