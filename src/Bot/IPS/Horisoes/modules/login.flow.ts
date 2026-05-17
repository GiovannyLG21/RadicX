import { Page } from 'playwright'
import { CREDENTIALS } from '../config/config'
import { LoginPage } from '@/Bot/utils'
import { LoginDataType } from '@/Bot/types'

async function LoginFlow(page: Page) {
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
    const loginPage = new LoginPage(page, loginData)

    const actualSession = await loginPage.verifySession()
    if (actualSession) return

    await loginPage.login()
    const session = await loginPage.verifySession()
    if (!session) throw new Error('Error al iniciar sesion en Odoo')
}

export default LoginFlow