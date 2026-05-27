import prisma from '@/config/prisma'
import { IPSDataType } from './ips.types'

export async function getAllIPS() {
    return await prisma.iPS.findMany()
}

export async function getIPS(id: string) {
    return await prisma.iPS.findUnique({
        where: {
            id: Number(id)
        }
    })
}

export async function getIPSByCode(code: string | undefined) {
    if (!code) return
    return await prisma.iPS.findUnique({
        where: {
            code
        }
    })
}

export async function getIPSByName(name: string) {
    return await prisma.iPS.findUnique({
        where: {
            name
        }
    })
}

export async function createIPS(data: IPSDataType) {
    return await prisma.iPS.create({
        data
    })
}

export async function updateIPS(code: string | undefined, data: IPSDataType) {
    if (!code) return
    return await prisma.iPS.update({
        where: {
            code
        },
        data
    })
}