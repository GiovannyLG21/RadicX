import { NODE_ENV } from "@/config/env"

//* Playwright config
export const HEADLESS_BROWSER = NODE_ENV === 'production'
export const SLOWMO_BROWSER = 10
export const DEFAULT_TIMEOUT = 30000
export const NAVIGATION_TIMEOUT = 30000