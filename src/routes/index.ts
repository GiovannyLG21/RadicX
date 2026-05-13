import { Router } from 'express'
import RoleRoutes from '@/modules/Role/role.routes'
import UserRoutes from '@/modules/User/user.routes'
import AuthRoutes from '@/modules/Auth/auth.routes'
import BotRoutes from '@/modules/Bot/bot.routes'

const router = Router()

// router.use('/roles', RoleRoutes)
// router.use('/users', UserRoutes)
// router.use('/auth', AuthRoutes)
router.use('/bots', BotRoutes)

export default router