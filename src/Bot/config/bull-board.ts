import { createBullBoard } from '@bull-board/api'
import { ExpressAdapter } from '@bull-board/express'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { HorisoesCoosaludFlowQueue, HorisoesCoosaludQueue, HorisoesCoosaludScheduler } from './queues'

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/queues')
createBullBoard({
    queues: [
        new BullMQAdapter(HorisoesCoosaludFlowQueue),
        new BullMQAdapter(HorisoesCoosaludQueue),
        new BullMQAdapter(HorisoesCoosaludScheduler)
    ],
    serverAdapter
})

export default serverAdapter

