import { createExecution } from './execution.service'
import { BillServicesType, WorkflowType } from '@/Bot/types'

export interface ExecutionDataType {
    workflow: WorkflowType,
    service: BillServicesType
}

export interface CreateExecutionDataType {
    ipsCode: string,
    epsCode: string
}

export type CreateExecutionReturnType = Awaited<ReturnType<typeof createExecution>>

export interface FinishExecutionDataType {
    metadata: object
}
