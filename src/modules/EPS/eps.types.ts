import z from 'zod'
import EPSScheme from './eps.scheme'

export type EPSDataType = z.infer<typeof EPSScheme>