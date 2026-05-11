import z from 'zod'

export const IPSCodeScheme = z.object({
    code: z
        .string()
        .min(2)
        .max(3),
    bills: z.string().array()
})
