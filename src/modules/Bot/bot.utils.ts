import { Page, BrowserContext } from 'playwright'
import { LoginDataType } from './bot.types'

//* Playwright
export class LoginPage {
    constructor(
        private page: Page,
        private data: LoginDataType
    ) { }

    async verifySession() {
        return await this.page.locator(this.data.sessionSelector)
            .waitFor({ state: 'visible', timeout: 3000 })
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
    }
}

export async function getPage(context: BrowserContext) {
    const actualPages = context.pages()
    if (actualPages.length > 0) return actualPages[0]!
    return await context.newPage()
}

export async function safeWait(page: Page, selector: string,) {
    try {
        return await page.waitForSelector(selector, { timeout: 3000 })
    } catch {
        return null;
    }
}

export async function delay(ms: number) {
    return new Promise(resolve =>
        setTimeout(resolve, ms)
    )
}

//* Generals
export const getFileType = (filename: string) => {
    return filename.split('.')[1]
}

export function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
}