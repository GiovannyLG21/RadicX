import z from 'zod'

export const executionScheme = z.object({
    ipsId: z.
        string()
        .min(1),
    epsId: z
        .string()
        .min(1),
    metadata: z.object()
})

export const executionUpdateScheme = z.object({
    metadata: z.object()
})