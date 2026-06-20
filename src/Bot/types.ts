import { Page } from 'playwright'
import { FlowChildJob } from 'bullmq'
import { CellValue } from 'exceljs'
import { HorisoesCoosaludInitiator } from './Workflows/horisoes-coosalud.workflow';

export interface WorkflowType {
    name: string
    ipsCode: string
    epsCode: string
    initiator: typeof HorisoesCoosaludInitiator
}

//* Bot Types
export type IPSBotType = (page: Page, bill: string) => Promise<BillDataType>
export type EPSBotType = (page: Page, bill: string, radicacionCodes: RadicacionCodesType) => Promise<BillDataType>


//* Worker Types
export interface JobDataType {
    data: {
        bill: string,
        radicacionCodes: RadicacionCodesType
    }
}

export type FlowChildJobType = JobDataType & FlowChildJob

//* Bill Status Type
export interface BillInfoType {
    success: boolean,
    status: BillStatusType,
    message: string
}

export type BillStatusType =
    | 'LOGIN_FAILED'
    | 'NOT_FOUND'
    | 'CONTRACT_NOT_FOUND'
    | 'CREATE_RADICACION_FAILED'
    | 'GET_RADICACION_FAILED'
    | 'SFTP_ERROR'
    | 'ERROR'
    | 'SUCCESS'
    | null


//* Bill Data Type
export type BillDataType = BaseBillDataType & BillInfoType

interface BaseBillDataType {
    bill: string,
    radicado?: string,
    contract: 'Contributivo' | 'Subsidiado' | null,
    files: {
        code: 'FEV' | 'XML' | 'CUV' | 'RIPS' | 'HEV'
        name: string,
        buffer: Buffer<ArrayBufferLike>
    }[]
}


//* Others
export interface LoginDataType {
    sessionSelector: string
    userSelector: string,
    passwordSelector: string,
    buttonSelector: string,
    credentials: {
        user: string,
        password: string
    }
}

export type ProcessedBillType = Omit<BillDataType, 'files'>

export type RadicacionCodesType = {
    contract: 'Contributivo' | 'Subsidiado',
    code: string
}[]

export type ExcelRowData = CellValue[]

export interface HorisoesCoosaludMetadataType {
    total_facturas: number;
    total_radicadas: number;
    total_fallidas: number;
    pre_radicados: {
        codigo: string;
        contrato: string;
        facturas: string[];
        cantidad_facturas: number;
    }[];
    fallidas: {
        codigos: string[];
        facturas: ProcessedBillType[]
    }
}