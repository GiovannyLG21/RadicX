import Router from 'express'
import { validateScheme } from '@/middlewares'
import EPSScheme from './eps.scheme'
import * as EPSController from './eps.controller'

const router = Router()

router.route('/')
    .get(EPSController.EPS)
    .post(
        validateScheme(EPSScheme),
        EPSController.createEPS
    )

router.route('/:code')
    .get(EPSController.getEPS)
    .put(validateScheme(EPSScheme), EPSController.updateEPS)

export default router