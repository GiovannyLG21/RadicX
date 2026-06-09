import util from 'node:util'
import { Page, BrowserContext } from 'playwright'
import { LoginDataType } from './types'
import { drive } from '@/Bot/config/googleapis'

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

/**
 * Funcion para buscar y descargar un archivo en una carpeta de Google Drive.
 * @param folderId Id de la carpeta que contiene el archivo
 * @param fileName Nombre del archivo buscado
 */
export async function downloadDriveFile(folderId: string, fileName: string): Promise<Buffer | undefined> {
    const res = await drive.files.list({
        q: `
            '${folderId}' in parents
            and name = '${fileName}'            
        `,
        fields: 'files(id, name, mimeType)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
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
}
