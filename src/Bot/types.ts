import z from 'zod'
import { BrowserContext } from 'playwright'

//* Bot Types
export type IPSBotType = (context: BrowserContext, bill: string) => Promise<BillDataType>
export type EPSBotType = (context: BrowserContext, bill: string, radicacionCodes: RadicacionCodesType) => Promise<RadicacionCodesType | undefined>

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
    | 'SUCCESS'
    | 'NOT_FOUND'
    | 'TIMEOUT'
    | 'CONTRACT_NOT_FOUND'
    | 'ERROR'
    | null

//* Bill Data Type
export type BillDataType = BaseBillDataType & BillInfoType

type BaseBillDataType = {
    bill: string,
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

export type ProcessedBillType = (Omit<
    BillDataType,
    'files'
> & {
    files: Omit<
        BillDataType['files'][number],
        'buffer'
    >[]
})

export type RadicacionCodesType = {
    contract: 'Contributivo' | 'Subsidiado',
    code: string
}[] | undefined