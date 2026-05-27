import { createBullBoard } from '@bull-board/api'
import { ExpressAdapter } from '@bull-board/express'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { playwrightFlowQueue, playwrightQueue } from './queues'

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/queues')
createBullBoard({
    queues: [
        new BullMQAdapter(playwrightFlowQueue),
        new BullMQAdapter(playwrightQueue)
    ],
    serverAdapter
})

export default serverAdapter

