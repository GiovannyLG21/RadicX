import { Router } from 'express'
import { authMiddleware, validateScheme } from '@/middlewares'
import RoleSchema from './role.scheme'
import * as roleController from './role.controller'
import { ROLES } from '@/config/permissions'

const router: Router = Router()

router.use(authMiddleware(ROLES.SUPER_ADMIN))

router.route('/')
    .get(roleController.roles)
    .post(validateScheme(RoleSchema), roleController.createRole)

router.route('/:id')
    .get(roleController.getRole)
    .put(validateScheme(RoleSchema), roleController.updateRole)
    .delete(roleController.deleteRole)

export default router