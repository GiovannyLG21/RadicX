import { BrowserContext, Page } from 'playwright'
import { LoginDataType } from '@/Bot/types'
import { LoginPage } from '@/Bot/utils'
import { CREDENTIALS } from './config/config'

class NuevaEpsBot {

    constructor(
        private context: BrowserContext,
        private page: Page
    ) { }

    async careHisLogin() {
        await this.page.goto('https://his-frontend-horisoes-demo-hcasdef4d0cwa2gs.eastus2-01.azurewebsites.net/#/')
        // Remember check
        await this.page.getByText('Recordar datos').click()
        // Login
        const loginData: LoginDataType = {
            sessionSelector: '#asdasd',
            userSelector: '#mat-input-0',
            passwordSelector: '#mat-input-1',
            buttonSelector: '.button.guardar.inactive',
            credentials: {
                user: CREDENTIALS.careHis.user,
                password: CREDENTIALS.careHis.password
            }
        }
        const loginPage = new LoginPage(this.context, this.page, loginData)
        await loginPage.run()
    }

    async nuevaEpsLogin() {
        await this.page.goto('https://portal.nuevaeps.com.co/Portal/home.jspx')
        const loginData: LoginDataType = {
            sessionSelector: 'span.tituloCampo',
            userSelector: '[name="loginForm:id"]',
            passwordSelector: '[name="loginForm:clave"]',
            buttonSelector: '[name="loginForm:loginButton"]',
            credentials: {
                user: CREDENTIALS.nuevaEps.user,
                password: CREDENTIALS.nuevaEps.password
            }
        }
        const loginPage = new LoginPage(this.context, this.page, loginData)
        await this.page.locator('[name="loginForm:tipoId"]').selectOption('3').catch(() => false)
        await loginPage.run()

        // Button 'SERVICIOS EN LINEA'
        await this.page.locator('#j_id88').click()
        // Button 'IPS'
        await this.page.locator('#j_id76 table tbody').locator('tr').nth(2).locator('a').click()
        // Select 'IPS'
        await this.page.locator('[name="j_id121:ips"]').selectOption('4;901011395;19773')
        // Select 'SUCURSAL'
        await this.page.locator('[name="j_id121:sucIps"]').selectOption('4;901011395;97193;901011395;4')
        // Button 'Aceptar'
        await this.page.locator('[name="j_id121:acceptButton"]').click()
        // Dropdown 'Autorizaciones'
        await this.page.locator('#j_id79').click()
        // Button 'Estado afiliacion'
        await this.page.locator('#option1161 table tbody tr').nth(0).locator('td').nth(1).locator('a').click()
    }
}

export default NuevaEpsBot