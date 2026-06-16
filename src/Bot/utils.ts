import util from 'node:util'
import mime from 'mime-types'
import { Readable } from 'node:stream'
import { Page, BrowserContext } from 'playwright'
import { LoginDataType } from './types'
import { drive, sheets } from '@/Bot/config/googleapis'

//* Playwright
/**
 * @class Clase Base para el logueo en plataformas
 * @param {LoginDataType} data Objeto con los datos para el login y navegacion
 */
export class LoginPage {
    constructor(
        private context: BrowserContext,
        private page: Page,
        private data: LoginDataType
    ) { }

    private async verifySession() {
        return await this.page.locator(this.data.sessionSelector)
            .waitFor({ state: 'visible', timeout: 8000 })
            .then(() => true)
            .catch(() => false)
    }

    private async login() {
        //User            
        await this.page.locator(this.data.userSelector).fill(this.data.credentials.user)
        //Password
        await this.page.locator(this.data.passwordSelector).fill(this.data.credentials.password)
        //Button
        await this.page.click(this.data.buttonSelector)
        this.context.storageState({
            path: 'playwright-data/session.json'
        })
    }

    /**
     * Metodo principal para el inicio de sesion en plataforma
     * @returns True o false si el inicio fue exitoso o no
     */
    async run() {
        const actualSession = await this.verifySession()
        if (actualSession) return true
        await this.login()
        const session = await this.verifySession()
        return session
    }
}

export async function delay(ms: number) {
    return new Promise(resolve =>
        setTimeout(resolve, ms)
    )
}

export function formatError(error: string) {
    return util.stripVTControlCharacters(error)
}

//* Google Apis
export const googleapis = {

    drive: {
        async downloadDriveFile(folderId: string, fileName: string): Promise<Buffer | undefined> {
            const res = await drive.files.list({
                q: `
            '${folderId}' in parents
            and name = '${fileName}'            
        `,
                fields: 'files(id, name, mimeType)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,                
            })

            const files = res.data.files
            if (!files?.length) return
            const fileId = files[0]?.id as string

            const download = await drive.files.get(
                {
                    fileId,
                    alt: 'media',
                },
                {
                    responseType: 'stream',
                }
            )

            const chunks: Buffer[] = []
            return new Promise((resolve, reject) => {
                download.data.on('data', (chunk) => {
                    chunks.push(chunk)
                })
                download.data.on('end', () => {
                    resolve(Buffer.concat(chunks))
                })
                download.data.on('error', reject)
            })
        },

        /**
         * Metodo para obtener una carpeta en Google Drive segun una carpeta padre.
         * @param {string} parentId Id de la carpeta padre
         * @param {string} folderName Nombre de la carpeta buscada
         */
        async getDriveFolder(parentId: string, folderName: string) {
            const res = await drive.files.list({
                q: `
                    name = '${folderName}'
                    and mimeType = 'application/vnd.google-apps.folder'
                    and '${parentId}' in parents
                    and trashed = false   
                `,
                fields: 'files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            })
            return res.data.files?.[0]
        },

        /**
         * Metodo para crear una carpeta en Google Drive segun una carpeta padre.
         * @param {string} parentId Id de la carpeta padre
         * @param {string} folderName Nombre de la carpeta buscada
         */
        async createDriveFolder(parentId: string, folderName: string) {
            const res = await drive.files.create({
                requestBody: {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId]
                },
                fields: 'id, name'
            })
            return res.data.id
        },

        /**
         * Metodo para subir un archivo en Google Drive segun una carpeta padre.
         * @param {string} parentId Id de la carpeta padre
         * @param {string} fileName Nombre del archivo
         * @param {string} buffer Buffer del archivo
         */
        async uploadDriveFile(parentId: string, fileName: string, buffer: Buffer<ArrayBufferLike>) {
            const res = await drive.files.create({
                supportsAllDrives: true,
                requestBody: {
                    name: fileName,
                    parents: [parentId]
                },
                media: {
                    mimeType: mime.lookup(fileName) || 'application/octet-stream',
                    body: Readable.from(buffer)
                },
                fields: 'id, name'
            })
            return res.data.id
        },
    },

    sheets: {

        /**
         * Metodo para crear una hoja en un archivo de google sheets.
         * @param {string} spreadsheetId Id del archivo google sheets
         * @param {string} sheetName Nombre de la hoja
         * @returns Id de la hoja.
         */
        async newSheet(spreadsheetId: string, sheetName: string) {
            const res = await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: sheetName,
                            },
                        }
                    }]
                }
            })
            return {
                sheetId: res.data.replies?.[0]?.addSheet?.properties?.sheetId as number | null
            }
        },

        /**
         * Metodo para verificar si una hoja existe en un archivo de google sheets.
         * @param {string} spreadsheetId Id del archivo google sheets
         * @param {string} sheet Nombre de la hoja
         */
        async existingSheet(spreadsheetId: string, sheet: string) {
            const file = await sheets.spreadsheets.get({ spreadsheetId })
            const existingSheet = file.data.sheets?.some(sheetData => sheetData.properties?.title === sheet)                        
            return existingSheet
        },

        /**
         * Metodo para obtener los valores de una hoja de google sheets segun el rango especificado.
         * @param {string} spreadsheetId Id del archivo google sheets
         * @param {string} sheet Nombre de la hoja
         * @param {string} range Rango de columna y fila 
         */
        async getValues(spreadsheetId: string, sheet: string, range: string) {
            const file = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheet}!${range}`
            })
            return file.data.values || []
        },

        /**
         * Metodo para insertar valores en la hoja de determinado archivo de google sheets.
         * @param {string} spreadsheetId Id del archivo google sheets
         * @param {string} sheet Nombre de la hoja
         * @param {string} range Rango de columna y fila 
         * @param {unknown[]} values Datos a insertar
         */
        async insertValues(spreadsheetId: string, sheet: string, range: string, values: unknown[]) {
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheet}!${range}`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [values]
                }
            })
        },

        /**
         * Metodo para buscar  valores en la hoja de determinado archivo de google sheets.
         * @param {string} spreadsheetId Id del archivo google sheets
         * @param {string} sheet Nombre de la hoja
         * @param {string} range Rango de columna y fila 
         * @param {unknown[]} values Datos a insertar
        */
        async updateValues(spreadsheetId: string, sheet: string, range: string, values: unknown[]) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheet}!${range}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [values],
                }
            })
        },

        /**
         * Metodo para insertar multiples filas en la hoja de determinado archivo de google sheets.
         * @param {string} spreadsheetId Id del archivo google sheets
         * @param {string} sheet Nombre de la hoja
         * @param {string} range Rango de columna y fila 
         * @param {unknown[][]} values Filas con datos a insertar
         */
        async insertRows(spreadsheetId: string, sheet: string, range: string, values: unknown[][]) {
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheet}!${range}`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values
                }
            })
        },

        styles: {

            /**
             * Metodo para cambiar el color de las celdas de determinado archivo de google sheets.
             * @param {string} spreadsheetId Id del archivo google sheets
             * @param {string} sheet Nombre de la hoja
             * @param range Objeto con los valores del rango
             * @param color Color en RGB **(255, 255, 255)**
            */
            async changeCellBgColor(spreadsheetId: string, sheet: string, range: { startColumn: number, endColumn: number, startRow: number, endRow: number }, color: string) {
                const file = await sheets.spreadsheets.get({ spreadsheetId })
                const sheetId = file.data.sheets?.find(sheetFounded => sheetFounded.properties?.title === sheet)?.properties?.sheetId ?? null
                const rgb = color.split(', ')
                const [red, blue, green] = [Number(rgb[0]) / 255, Number(rgb[1]) / 255, Number(rgb[2]) / 255]                

                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [{
                            repeatCell: {
                                range: {
                                    sheetId,
                                    startColumnIndex: range.startColumn,
                                    endColumnIndex: range.endColumn,
                                    startRowIndex: range.startRow,
                                    endRowIndex: range.endRow
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: {
                                            red,
                                            green,
                                            blue
                                        }
                                    }
                                },
                                fields: 'userEnteredFormat.backgroundColor'
                            }
                        }]
                    }
                })
            }

        }
    }
}