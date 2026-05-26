import { Request, Response, NextFunction } from 'express'

type AsyncFn = (
    req: Request<{ id: string, code: string }>,
    res: Response,
    next: NextFunction
) => Promise<any>

/**
 * Try catch para los controladores
 * @param fn Funcion del controlador
 * @returns Resolucion de la promesa o catch del error para llevarlo hacia el error middleware
 */
const asyncHandler = (fn: AsyncFn) => (
    req: Request<{ id: string, code: string }>, res: Response, next: NextFunction
) => Promise.resolve(fn(req, res, next)).catch(next)

export default asyncHandler
