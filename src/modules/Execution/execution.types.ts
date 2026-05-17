import z from 'zod'
import { executionScheme, executionUpdateScheme } from './execution.scheme'

export type executionDataType = z.infer<typeof executionScheme>
export type executionUpdateDataType = z.infer<typeof executionUpdateScheme>

export type BillsCodesType = string[]