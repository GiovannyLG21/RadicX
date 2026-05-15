import z from 'zod'
import { capitalize } from '@/utils'

const IPSScheme = z.object({
    name: z
        .string()
        .min(10)
        .max(100)
        .transform(capitalize),
    code: z
        .string()
        .min(9)
        .max(11)
})

export default IPSScheme