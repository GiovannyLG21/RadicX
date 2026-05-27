import prisma from '@/config/prisma'
import { EPSDataType } from './eps.types'

export async function getAllEPS() {
    return await prisma.ePS.findMany()
}

export async function getEPS(id: string) {
    return await prisma.ePS.findUnique({
        where: {
            id: Number(id)
        }
    })
}

export async function getEPSByCode(code: string | undefined) {
    if (!code) return
    return await prisma.ePS.findUnique({
        where: {
            code
        }
    })
}

export async function getEPSByName(name: string) {
    return await prisma.ePS.findUnique({
        where: {
            name
        }
    })
}

export async function createEPS(data: EPSDataType) {
    return await prisma.ePS.create({
        data
    })
}

export async function updateEPS(code: string | undefined, data: EPSDataType) {
    if (!code) return
    return await prisma.ePS.update({
        where: {
            code
        },
        data
    })
}