import { JWTPayload } from '.'
import { EPSListType } from '@/modules/Bot/bot.types'

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload
            eps?: EPSListType
        }
    }
}

export { };