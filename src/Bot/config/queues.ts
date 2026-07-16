import { Queue } from 'bullmq'
import { REDIS_HOST, REDIS_PASSWORD } from '@/config/env'

export const HorisoesCoosaludFlowQueue = new Queue('horisoes_coosalud_flow', {
    connection: {
        host: REDIS_HOST,
        port: 6379,
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: null
    }
})
export const HorisoesCoosaludQueue = new Queue('horisoes_coosalud_queue', {
    connection: {
        host: REDIS_HOST,
        port: 6379,
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: null
    }
})
export const HorisoesCoosaludScheduler = new Queue('horisoes_coosalud_scheduler', {
    connection: {
        host: REDIS_HOST,
        port: 6379,
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: null
    }
})
async function setHorisoesCoosaludScheduler() {
    await HorisoesCoosaludScheduler.upsertJobScheduler(
        'horisoes_coosalud_repeteable_job',
        {
            pattern:  '0 0 11 * * *', // Diario a las 6am.
        },
        {
            name: 'check-preradicados-job',            
            opts: {                
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 3000
                },
                removeOnComplete: false,
                removeOnFail: false
            }
        }
    )
}
setHorisoesCoosaludScheduler()
