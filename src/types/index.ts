export interface JWTPayload {
    sub: string,
    data?: {
        username: string,
        email: string,
        role: string
    },
    iat?: number,
    exp?: number
}