import { NextFunction, Request, Response } from 'express'
// eslint-disable-next-line
export default function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = 500
  console.log(err)

  res.status(status).json({
    message: err instanceof Error ? err.message : 'Internal server error',
    status
  })
}