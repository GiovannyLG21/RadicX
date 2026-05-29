import { Router } from 'express'
import { upload, validateScheme } from '@/middlewares'
import { executionScheme } from './execution.scheme'
import * as executionController from './execution.controller'
import { validateBillsFile } from './execution.middleware'

const router: Router = Router()

router.get('/test', executionController.Test)

router.post('/radicados', executionController.getCreatedRadicados)

router.route('/')
    .get(executionController.executions)
    .post(upload.single('bills'),
        validateBillsFile,
        validateScheme(executionScheme),
        executionController.createExecution)

router.route('/:id')
    .get(executionController.getExecution)

router.get('/radicado/:code', executionController.getRadicadoBills)

router.post('/processed', executionController.getAllProcessed)

export default router