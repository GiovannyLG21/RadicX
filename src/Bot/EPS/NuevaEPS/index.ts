import { execPlaywright, newContext } from '@/Bot'
import { LoginFlow } from './modules/login.flow'

async function NuevaEPSBot() {
    const browser = await execPlaywright()
    const context = await newContext(browser)
    const page = await browser.newPage()

    await page.goto('https://portal.nuevaeps.com.co/Portal/home.jspx')
    await LoginFlow(context, page)

    // Button 'SERVICIOS EN LINEA'
    await page.locator('#j_id88').click()
    // Button 'IPS'
    await page.locator('#j_id76 table tbody').locator('tr').nth(2).locator('a').click()
    // Select 'IPS'
    await page.locator('[name="j_id121:ips"]').selectOption('4;901011395;19773')
    // Select 'SUCURSAL'
    await page.locator('[name="j_id121:sucIps"]').selectOption('4;901011395;97193;901011395;4')
    // Button 'Aceptar'
    await page.locator('[name="j_id121:acceptButton"]').click()
    // Dropdown 'Autorizaciones'
    await page.locator('#j_id79').click()
    // Button 'Estado afiliacion'
    await page.locator('#option1161 table tbody tr').nth(0).locator('td').nth(1).locator('a').click()
}

export default NuevaEPSBot