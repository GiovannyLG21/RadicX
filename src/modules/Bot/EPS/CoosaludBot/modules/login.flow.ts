import { LoginDataType } from '@/modules/Bot/bot.types'
import { LoginPage } from '@/modules/Bot/bot.utils'
import { Page } from 'playwright'
import { CREDENTIALS } from '../config/config'

async function loginFlow(page: Page) {
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
    const loginPage = new LoginPage(page, loginData)

    const actualSession = await loginPage.verifySession()
    if (actualSession) return

    await loginPage.login()
    const session = await loginPage.verifySession()
    if (!session) throw new Error('Error al iniciar sesion')
}

export default loginFlow