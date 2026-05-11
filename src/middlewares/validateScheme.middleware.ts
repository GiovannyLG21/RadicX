import { Request, Response, NextFunction } from 'express'
import { z, ZodObject } from 'zod'


const validateScheme = (scheme: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    const body = req.body
    try {
        scheme.parse(body)
        next()
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ 
                error: error.issues.map(err => `${err.path}: ${err.message}`),
                status: 400
            })
        }
    }
}

export default validateScheme