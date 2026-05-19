import { Page } from 'playwright'

//* Bot Types
export type IPSBotType = (page: Page, bill: string) => Promise<BillDataType>
export type EPSBotType = (page: Page, bill: string, radicacionCodes: RadicacionCodesType) => Promise<BillDataType>


//* Worker Types
export type JobDataType = {
    execution: string,
    bill: string
    ipsCode: string,
    epsCode: string
}


//* Bill Status Type
export type BillInfoType = {
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

type BaseBillDataType = {
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
export type LoginDataType = {
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