import z from 'zod'
import { executionScheme, executionUpdateScheme } from './execution.scheme'
import { createExecution } from './execution.service'

export type executionDataType = z.infer<typeof executionScheme>
export type createExecutionDataType = Awaited<ReturnType<typeof createExecution>>
export type executionUpdateDataType = z.infer<typeof executionUpdateScheme>
export type GetRadicadosDataType = Omit<executionDataType, 'metadata'>
export type ExecutionMetadataType = executionUpdateDataType['metadata']

export type BillsCodesType = string[]