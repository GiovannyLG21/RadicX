import { Router } from 'express'
import RoleRoutes from '@/modules/Role/role.routes'
import UserRoutes from '@/modules/User/user.routes'
import AuthRoutes from '@/modules/Auth/auth.routes'
import IPSRoutes from '@/modules/IPS/ips.routes'
import EPSRoutes from '@/modules/EPS/eps.routes'
import ExecutionRoutes from '@/modules/Execution/execution.routes'
import BotRoutes from '@/modules/Bot/bot.routes'


const router = Router()

// router.use('/roles', RoleRoutes)
// router.use('/users', UserRoutes)
// router.use('/auth', AuthRoutes)
router.use('/ips', IPSRoutes)
router.use('/eps', EPSRoutes)
router.use('/executions', ExecutionRoutes)
router.use('/bots', BotRoutes)

export default router