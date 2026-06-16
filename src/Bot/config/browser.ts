import fs from 'fs'
import { Browser } from 'playwright'
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { DEFAULT_TIMEOUT, HEADLESS_BROWSER, NAVIGATION_TIMEOUT, SLOWMO_BROWSER } from './config'

chromium.use(StealthPlugin())

/**
 * Funcion para la **inicializacion del navegador**.
 */
export async function execPlaywright() {
    const browser = await chromium.launch({
        headless: HEADLESS_BROWSER,
        slowMo: SLOWMO_BROWSER,
    })
    return browser
}

/**
 * Funcion para la **creación de un nuevo contexto** del navegador.
 * @param browser Navegador inicializado
 */
export async function newContext(browser: Browser) {
    const context = await browser.newContext(
        fs.existsSync('playwright-data/session.json') ? {
            storageState: 'playwright-data/session.json',
            acceptDownloads: true,
        } : {
            acceptDownloads: true,
        }
    )
    context.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT)
    context.setDefaultTimeout(DEFAULT_TIMEOUT)
    return context
}