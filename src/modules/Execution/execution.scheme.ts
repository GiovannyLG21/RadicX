import { ProcessedBillType } from '@/Bot/types'
import z from 'zod'

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
        cantidad_facturas: z.number(),
        facturas: z.object({
            exitosas: z.object({
                codigos: z.string().array(),
                facturas: z.custom<ProcessedBillType>().array()
            }),
            fallidas: z.object({
                codigos: z.string().array(),
                facturas: z.custom<ProcessedBillType>().array()
            })
        })
    })
})