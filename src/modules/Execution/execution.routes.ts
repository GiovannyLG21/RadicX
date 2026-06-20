import { Router } from 'express'
import { upload } from '@/middlewares'
import { validateBillsFile } from '@/Bot/middlewares'
import { Workflows } from '@/Bot/index'
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

router.get('/horisoes/coosalud/health',
    validateWorkflow(Workflows.HorisoesCoosaludWorkflow),
    executionController.HorisoesCoosaludHealth)

router.post('/horisoes/coosalud/execute',
    upload.single('bills'),
    validateBillsFile,
    validateWorkflow(Workflows.HorisoesCoosaludWorkflow),
    executionController.HorisoesCoosaludExecution)

export default router