import { Router } from 'express'
import { upload } from '@/middlewares'
import { validateBillsFile } from '@/Bot/middlewares'
import { Workflows } from '@/Bot/config/config'
import { validateWorkflow } from './execution.middleware'
import * as executionController from './execution.controller'

const router: Router = Router()

//* Main
router.get('/test', executionController.Test)

router.get('/', executionController.executions)
router.get('/:id', executionController.getExecution)


//* Bots
router.get('/horisoes/coosalud',
    validateWorkflow(Workflows.HorisoesCoosaludWorkflow),
    executionController.HorisoesCoosaludProccesed)

router.post('/horisoes/coosalud/execute',
    validateWorkflow(Workflows.HorisoesCoosaludWorkflow),
    upload.single('bills'),
    validateBillsFile,
    executionController.HorisoesCoosaludExecution)

export default router