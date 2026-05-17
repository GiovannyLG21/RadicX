import { Queue } from 'bullmq'
import { REDIS_CONNECTION } from './config'

export const playwrightQueue = new Queue('playwright-execution', { connection: REDIS_CONNECTION })
