import { JWTPayload } from '.'

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload            
        }
    }
}

export { };