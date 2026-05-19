import Router from 'express'
import { upload, validateScheme } from '@/middlewares'
import { executionScheme, executionUpdateScheme } from './execution.scheme'
import * as executionController from './execution.controller'
import { validateBillsFile } from './execution.middleware'

const router = Router()

router.route('/')
    .get(executionController.executions)
    .post(upload.single('bills'),
        validateBillsFile,
        validateScheme(executionScheme),
        executionController.createExecution)

router.route('/:id')
    .get(executionController.getExecution)
    .put(validateScheme(executionUpdateScheme),
        executionController.finishExecution)
        
router.route('/metadata/:id')
    .get(executionController.createMetadata)

router.post('/processed', executionController.getProcessed)

export default router