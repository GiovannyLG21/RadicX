import { Queue } from 'bullmq'
import { REDIS_CONNECTION } from './config'

export const playwrightFlowQueue = new Queue('playwright-flow', { connection: REDIS_CONNECTION })
export const playwrightQueue = new Queue('playwright-queue', { connection: REDIS_CONNECTION })

