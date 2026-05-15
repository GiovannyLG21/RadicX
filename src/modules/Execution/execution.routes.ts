import Router from 'express'
import { validateScheme } from '@/middlewares'
import { executionScheme, executionUpdateScheme } from './execution.scheme'
import * as executionController from './execution.controller'

const router = Router()

router.route('/')
    .get(executionController.executions)
    .post(validateScheme(executionScheme),
        executionController.createExecution)

router.route('/:id')
    .get(executionController.getExecution)
    .put(validateScheme(executionUpdateScheme),
        executionController.finishExecution)

export default router