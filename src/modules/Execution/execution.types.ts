import { createExecution } from './execution.service'
import { WorkflowType } from '@/Bot/types'

export interface ExecutionDataType {
    workflow: WorkflowType
}

export interface CreateExecutionDataType {
    ipsCode: string,
    epsCode: string
}

export type CreateExecutionReturnType = Awaited<ReturnType<typeof createExecution>>

export interface FinishExecutionDataType {
    metadata: object
}
