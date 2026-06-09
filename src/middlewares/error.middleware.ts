import { Request, Response } from 'express'

export default function errorMiddleware(err: unknown, _req: Request, res: Response) {
  const status = 500
  console.log(err)

  res.status(status).json({
    message: err instanceof Error ? err.message : 'Internal server error',
    status
  })
}