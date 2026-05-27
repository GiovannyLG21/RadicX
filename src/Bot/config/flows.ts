import { FlowProducer } from 'bullmq'
import { REDIS_HOST, REDIS_PASSWORD } from '@/config/env'

export const playwrightFlow = new FlowProducer({
    connection: {
        host: REDIS_HOST,
        port: 6379,
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: null
    }
})