import { Queue } from 'bullmq'
import { REDIS_HOST, REDIS_PASSWORD } from '@/config/env'

export const playwrightFlowQueue = new Queue('playwright-flow', { connection: { 
    host: REDIS_HOST,
    port: 6379,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null 
} })
export const playwrightQueue = new Queue('playwright-queue', { connection: { 
    host: REDIS_HOST,
    port: 6379,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null 
} })

