import z from 'zod'
import IPSScheme from './ips.scheme'

export type IPSDataType = z.infer<typeof IPSScheme>