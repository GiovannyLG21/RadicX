import { Router } from 'express'
import * as userController from './user.controller'
import { validateScheme } from '@/middlewares'
import userScheme from './user.scheme'

const router = Router()

router.route('/')
    .get(userController.users)
    .post(validateScheme(userScheme), userController.createUser)

router.route('/:id')
    .get(userController.getUser)

export default router