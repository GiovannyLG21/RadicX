import { BrowserContext } from 'playwright'
import loginFlow from './modules/login.flow'
import radicacionFlow from './modules/radicacion.flow'

async function CoosaludBot(context: BrowserContext) {
    const page = await context.newPage()
    await page.goto('https://vco.ctamedicas.com/app/')

    await loginFlow(page)

    await page.goto('https://vco.ctamedicas.com/app/radicaciones')
    const radicacionCode = await radicacionFlow(page)

    return radicacionCode
}

export default CoosaludBot