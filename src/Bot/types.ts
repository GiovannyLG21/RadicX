import { FlowChildJob } from 'bullmq'
import { CellValue } from 'exceljs'
import { HorisoesCoosaludInitiator } from './Workflows/horisoes-coosalud.workflow'

export interface WorkflowType {
    name: string
    ipsCode: string
    epsCode: string
    initiator: typeof HorisoesCoosaludInitiator
}

//* Flow & Job Types
export type FlowChildJobType = FlowChildJob & JobDataType

export interface JobDataType {
    data: {
        service: BillServicesType,
        radicacionCodes: RadicacionCodesType,
        bill: string
    }
}

//* Bill Types

//? Bill Status
export type BillStatusType =
    | 'LOGIN_FAILED'
    | 'NOT_FOUND'
    | 'CONTRACT_NOT_FOUND'
    | 'CREATE_RADICACION_FAILED'
    | 'GET_RADICACION_FAILED'
    | 'SFTP_ERROR'
    | 'GOOGLE_DRIVE_ERROR'
    | 'ERROR'
    | 'SUCCESS'
    | null

export interface BillInfoType {
    success: boolean,
    status: BillStatusType,
    message: string
}

//? Bill Data
export type BillDataType = BaseBillDataType & BillInfoType

export type BillServicesType = 'FRAMINGHAM' | 'GESTION_TERRITORIAL' | 'FIEBRE_AMARILLA' | 'PENTAVALENTE' | ''

export type BillFileCodesType = 'FEV' | 'XML' | 'CUV' | 'RIPS' | 'HEV'

interface BaseBillDataType {
    bill: string,
    service: BillServicesType
    radicado?: string,
    contract: 'Contributivo' | 'Subsidiado' | null,
    files: {
        code: BillFileCodesType
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
        radicado: boolean;
    }[];
    fallidas: {
        codigos: string[];
        facturas: ProcessedBillType[]
    }
}

export type PreRadicadosCreatedType = {
    executionId: string
    code: string
}[]