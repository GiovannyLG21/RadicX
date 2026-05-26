import z from 'zod'
import { ProcessedBillType } from '@/Bot/types'

export const executionScheme = z.object({
    ipsCode: z.
        string()
        .min(1),
    epsCode: z
        .string()
        .min(1),
    metadata: z.string()
})

export const executionUpdateScheme = z.object({
    metadata: z.object({
        total_facturas: z.number(),
        total_radicadas: z.number(),
        total_fallidas: z.number(),
        pre_radicados: z.object({
            codigo: z.string(),
            contrato: z.string(),
            facturas: z.string().array(),
            cantidad_facturas: z.number()
        }).array(),
        fallidas: z.object({
            codigos: z.string().array(),
            facturas: z.custom<ProcessedBillType>().array()
        })
    })
})