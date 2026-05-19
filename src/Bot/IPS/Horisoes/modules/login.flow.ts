import { BrowserContext, Page } from 'playwright'
import { CREDENTIALS } from '../config/config'
import { formatError, LoginPage } from '@/Bot/utils'
import { LoginDataType } from '@/Bot/types'

async function LoginFlow(context: BrowserContext, page: Page) {
    try {
        const loginData: LoginDataType = {
            sessionSelector: '.o-dropdown.dropdown.o_user_menu',
            userSelector: '#login',
            passwordSelector: '#password',
            buttonSelector: '.btn[type="submit"]',
            credentials: {
                user: CREDENTIALS.user,
                password: CREDENTIALS.password
            }
        }
        const loginPage = new LoginPage(context, page, loginData)

        const actualSession = await loginPage.verifySession()
        if (actualSession) return

        await loginPage.login()
        const session = await loginPage.verifySession()
        if (!session) throw new Error('Login error')
    } catch (err: any) {
        console.error(err.message)
        return `Error al iniciar sesion en ODOO: ${formatError(err.message)}`
    }
}

export default LoginFlow