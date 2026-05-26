import { Router } from 'express'
import { authMiddleware, validateScheme } from '@/middlewares'
import { loginScheme, registerScheme } from './auth.scheme'
import * as authController from './auth.controller'

const router: Router = Router()

router.post('/login', validateScheme(loginScheme), authController.login)
router.post('/register', validateScheme(registerScheme), authController.register)
router.get('/logout', authMiddleware, authController.logout)

export default router