import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import cors from 'cors'
import Routes from './routes'
import { errorMiddleware } from './middlewares'
import { NODE_ENV, WEB_URL } from './config/env'

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(morgan(NODE_ENV === 'development' || NODE_ENV === 'test' ? 'dev' : 'common'))
app.use(cors({
    origin: WEB_URL,
    credentials: true
}))

app.use('/api', Routes)
app.use(errorMiddleware)
export default app