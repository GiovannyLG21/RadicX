import { LoginDataType } from '@/Bot/types'
import { formatError, LoginPage } from '@/Bot/utils'
import { CREDENTIALS } from '../config/config'
import { BrowserContext, Page } from 'playwright'


export async function LoginFlow(context: BrowserContext, page: Page) {
    try {
        const loginData: LoginDataType = {
            sessionSelector: 'span.tituloCampo',
            userSelector: '[name="loginForm:id"]',
            passwordSelector: '[name="loginForm:clave"]',
            buttonSelector: '[name="loginForm:loginButton"]',
            credentials: {
                user: CREDENTIALS.user,
                password: CREDENTIALS.password
            }
        }
        const loginPage = new LoginPage(context, page, loginData)

        const actualSession = await loginPage.verifySession()
        if (actualSession) return

        await page.locator('[name="loginForm:tipoId"]').selectOption('3')
        
        await loginPage.login()
        const session = await loginPage.verifySession()
        if (!session) throw new Error('Login error')

    } catch (err: any) {
        console.error(err.message)
        return `Error al iniciar sesion en NUEVA EPS: ${formatError(err.message)}`
    }
}