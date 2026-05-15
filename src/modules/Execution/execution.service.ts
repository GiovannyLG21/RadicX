import prisma from '@/config/prisma'
import { executionDataType, executionUpdateDataType } from './execution.types'

export async function executions() {
    return await prisma.executions.findMany()
}

export async function getExecution(id: string | undefined) {
    if (!id) return
    return await prisma.executions.findUnique({
        where: {
            id
        }
    })
}

export async function createExecution(data: executionDataType) {
    const { epsId, ipsId, ...executionData } = data
    return await prisma.executions.create({
        data: {
            ipsId: Number(ipsId),
            epsId: Number(epsId),
            statusId: 1,
            ...executionData
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
            metadata,
            finished_at: new Date()
        }
    })
}