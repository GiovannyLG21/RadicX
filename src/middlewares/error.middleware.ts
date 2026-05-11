import { Request, Response, NextFunction } from 'express'

export default function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.statusCode ?? 500
  console.log(err)

  res.status(status).json({
    message: err.message ?? 'Internal server error',
    status
  })
}