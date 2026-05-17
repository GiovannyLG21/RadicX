import IORedis from 'ioredis'
import HorisoesBot from '@/Bot/IPS/Horisoes/index'
import CooSaludBot from '@/Bot/EPS/CooSalud/index'

//* Redis Connection
export const REDIS_CONNECTION = new IORedis({ maxRetriesPerRequest: null })

//* Playwright config
export const HEADLESS_BROWSER = false
export const SLOWMO_BROWSER = 10
export const DEFAULT_TIMEOUT = 10000
export const NAVIGATION_TIMEOUT = 20000

//* IPS Bots
export const IPSBots = [
    {
        code: '901749264',
        bot: HorisoesBot,
        AvailableEPS: ['EPS042']
    }
]

//* EPS Bots
export const EPSBots = [
    {
        code: 'EPS042',
        bot: CooSaludBot
    }
]