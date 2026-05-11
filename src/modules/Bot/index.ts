import { chromium, BrowserContext } from 'playwright'
import { DEFAULT_TIMEOUT, HEADLESS_BROWSER, NAVIGATION_TIMEOUT, SLOWMO_BROWSER } from './config/config'

let context: BrowserContext | null = null

export async function execPlaywright() {
    if (context) return context
    context = await chromium.launchPersistentContext(
        './playwright-data',
        {
            headless: HEADLESS_BROWSER,
            slowMo: SLOWMO_BROWSER,
            acceptDownloads: true
        }
    )
    context.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT)
    context.setDefaultTimeout(DEFAULT_TIMEOUT)
    return context
}


