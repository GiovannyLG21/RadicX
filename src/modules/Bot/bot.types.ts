import z from 'zod'
import { BrowserContext } from 'playwright'
import { IPSCodeScheme } from './bot.scheme'

//* EPS
export type EPSListType = {
    code: string,
    name: string,
    bot: EPSBotType
}
export type EPSBotType = (context: BrowserContext) => Promise<string>

//* IPS
export type IPSListType = Record<string, {
    code: string,
    name: string
    shortname: string
    bot: IPSBotType
    EPS: Array<EPSListType>
}>
export type IPSCodeType = z.infer<typeof IPSCodeScheme>
export type IPSBotType = (EPSBot: EPSBotType, bills: string[]) => any

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

export type BillFilesType = {
    bill: string,
    files: {
        code: 'FEV' | 'XML' | 'CUV' | 'RIPS' | 'HEV'
        name: string,
        buffer: Buffer<ArrayBufferLike>
    }[]
}