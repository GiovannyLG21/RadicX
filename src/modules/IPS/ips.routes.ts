import {Router} from 'express'
import * as IPSController from './ips.controller'
import { validateScheme } from '@/middlewares'
import IPSScheme from './ips.scheme'

const router: Router = Router()

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