import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import cors from 'cors'
import Routes from './routes'
import { errorMiddleware } from './middlewares'
import { NODE_ENV, WEB_URL } from './config/env'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { playwrightQueue } from './Bot/config/queues'

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(morgan(NODE_ENV === 'development' || NODE_ENV === 'test' ? 'dev' : 'common'))
app.use(cors({
    origin: WEB_URL,
    credentials: true
}))

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/queues')
createBullBoard({
  queues: [new BullMQAdapter(playwrightQueue)],
  serverAdapter
})

app.use('/api', Routes)
app.use(errorMiddleware)
app.use('/admin/queues', serverAdapter.getRouter())
export default app