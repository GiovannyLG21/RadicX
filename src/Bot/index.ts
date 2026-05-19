import fs from 'fs'
import { chromium, Browser } from 'playwright'
import { DEFAULT_TIMEOUT, HEADLESS_BROWSER, NAVIGATION_TIMEOUT, SLOWMO_BROWSER } from './config/config'

export async function execPlaywright() {
    const browser = await chromium.launch({
        headless: HEADLESS_BROWSER,
        slowMo: SLOWMO_BROWSER,
    })
    return browser
}

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

