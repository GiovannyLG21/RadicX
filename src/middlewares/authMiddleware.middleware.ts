import { JWT_SECRET } from '@/config/env'
import { JWTPayload } from '@/types'
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import * as userService from '@/modules/User/user.service'

const authMiddleware = (role: string) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.cookies
        if (!token) throw new Error

        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload

        const user = await userService.getUserById(decoded.sub)        
        if (!user) throw new Error

        if (user.role.name.toLowerCase() !== role.toLowerCase()) return res.status(403).json({
            message: 'Permisos insuficientes',
            status: 403
        })

        req.user = decoded
        next()
    } catch (err) {
        res.status(401).json({
            message: 'Credenciales invalidas',
            status: 401
        })
    }
}

export default authMiddleware