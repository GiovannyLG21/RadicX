import { LoginDataType } from '@/Bot/types'
import { formatError, LoginPage } from '@/Bot/utils'
import { BrowserContext, Page } from 'playwright'
import { CREDENTIALS } from '../config/config'

async function loginFlow(context: BrowserContext, page: Page) {
    try {
        const loginData: LoginDataType = {
            sessionSelector: 'a.sidebar-nav-link[href="#radicaciones"]',
            userSelector: '#usuarioIngreso',
            passwordSelector: '#contraseniaIngreso',
            buttonSelector: '[name="validarSesion"]',
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
        return `Error al iniciar sesion en CooSalud ${formatError(err.message)}`
    }
}

export default loginFlow