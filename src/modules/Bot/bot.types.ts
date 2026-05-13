import z from 'zod'
import { BrowserContext, Page } from 'playwright'
import { IPSCodeScheme } from './bot.scheme'

//* EPS
export type EPSListType = {
    code: string,
    name: string,
    bot: EPSBotType
}
export type EPSBotType = (page: Page, billsFiles: BillFilesType[]) => Promise<RadicacionCodesType | undefined>

//* IPS
export type IPSListType = Record<string, {
    code: string,
    name: string
    shortname: string
    bot: IPSBotType
    EPS: Array<EPSListType>
}>
export type IPSCodeType = z.infer<typeof IPSCodeScheme>
export type IPSBotType = (EPSBot: EPSBotType, bills: string[]) => Promise<ProccessedBillsType | BillFilesType[]>

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

export type StatusType =
    | 'SUCCESS'
    | 'NOT_FOUND'
    | 'TIMEOUT'
    | 'CONTRACT_NOT_FOUND'

export type MessageType =
    | 'Factura no encontrada'
    | 'Contrato no encontrado'
    | 'Paciente no encontrado al descargar HEV'
    | 'HEV no encontrado'
    | 'Factura descargada'
    | 'Factura & RIPS descargados'
    | 'Factura, RIPS & HEV descargados'
    | 'Factura, RIPS & HEV cargados en sftp'

export type BillStatusType = {
    success: boolean,
    status: StatusType,
    message: MessageType
}

type BaseBillFilesType = {
    bill: string,
    contract: 'Contributivo' | 'Subsidiado' | null,
    files: {
        code: 'FEV' | 'XML' | 'CUV' | 'RIPS' | 'HEV'
        name: string,
        buffer: Buffer<ArrayBufferLike>
    }[]
}

export type BillFilesType = BaseBillFilesType & BillStatusType

export type ProccessedBillsType = (Omit<
    BillFilesType,
    'files'
> & {
    files: Omit<
        BillFilesType['files'][number],
        'buffer'
    >[]
})[]

export type RadicacionCodesType = {
    contract: 'Contributivo' | 'Subsidiado',
    code: string
}[]