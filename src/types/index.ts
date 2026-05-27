export type JWTPayload = {
    sub: string,
    data?: {
        username: string,
        email: string,
        role: string
    },
    iat?: number,
    exp?: number
}