import Router from 'express'
import { validateScheme } from '@/middlewares'
import IPSScheme from './ips.scheme'
import * as IPSController from './ips.controller'

const router = Router()

router.route('/')
    .get(IPSController.IPS)
    .post(
        validateScheme(IPSScheme),
        IPSController.createIPS
    )

router.route('/:code')
    .get(IPSController.getIPS)
    .put(validateScheme(IPSScheme), IPSController.updateIPS)

export default router