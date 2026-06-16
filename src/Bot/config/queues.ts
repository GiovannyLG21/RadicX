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
        'horisoes_coosalud_friday_repeteable_job',
        {
            pattern:  '0 0 6 * * 5', // Viernes de cada semana a las 6am.
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
    await HorisoesCoosaludScheduler.upsertJobScheduler(
        'horisoes_coosalud_lastMonthDay_repeteable_job',
        {
            pattern:  '0 0 18 L * *', // Ultimo dia de cada mes a las 6pm (18:00).
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
