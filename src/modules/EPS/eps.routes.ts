import { Router } from 'express'
import * as EPSController from './eps.controller'
import { validateScheme } from '@/middlewares'
import EPSScheme from './eps.scheme'

const router: Router = Router()

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