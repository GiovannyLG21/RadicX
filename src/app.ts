import express, { Express } from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import cors from 'cors'
import { NODE_ENV, WEB_URL } from './config/env'
import Routes from './routes'
import { errorMiddleware } from './middlewares'
import serverAdapter from './Bot/config/bull-board'

const app: Express = express()

app.use(express.json())
app.use(cookieParser())
app.use(morgan(NODE_ENV === 'development' || NODE_ENV === 'test' ? 'dev' : 'common'))
app.use(cors({
  origin: WEB_URL,
  credentials: true
}))

app.use('/admin/queues', serverAdapter.getRouter())
app.use('/api', Routes)
app.use(errorMiddleware)

export default app