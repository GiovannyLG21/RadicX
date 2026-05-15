import z from 'zod'
import { capitalize } from '@/utils'

const EPSScheme = z.object({
    name: z
        .string()
        .min(10)
        .max(100)
        .transform(capitalize),
    code: z
        .string()
        .min(6)
        .max(10)
})

export default EPSScheme