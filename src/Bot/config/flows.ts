import { FlowProducer } from 'bullmq'
import { REDIS_CONNECTION } from './config'

export const playwrightFlow = new FlowProducer({ connection: REDIS_CONNECTION })