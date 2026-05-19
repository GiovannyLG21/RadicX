import { Page, BrowserContext } from 'playwright'
import { LoginDataType } from './types'
import util from 'node:util'

//* Playwright
export class LoginPage {
    constructor(
        private context: BrowserContext,
        private page: Page,
        private data: LoginDataType
    ) { }

    async verifySession() {
        return await this.page.locator(this.data.sessionSelector)
            .waitFor({ state: 'visible', timeout: 8000 })
            .then(() => true)
            .catch(() => false)
    }

    async login() {
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
}

export async function getPage(context: BrowserContext) {
    const actualPages = context.pages()
    if (actualPages.length > 0) return actualPages[0]!
    return await context.newPage()
}

export async function delay(ms: number) {
    return new Promise(resolve =>
        setTimeout(resolve, ms)
    )
}

export function formatError(error: any) {
    return util.stripVTControlCharacters(error)
}