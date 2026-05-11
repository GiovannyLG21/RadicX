import { Router } from 'express'
import { validateScheme } from '@/middlewares'
import * as botController from './bot.controller'
import { validateBillsFile, validateSelectedEPS } from './bot.middleware'
import { IPSCodeScheme } from './bot.scheme'
import { upload } from '@/middlewares'

const router = Router()

router.post('/eps/available', validateScheme(IPSCodeScheme), botController.availableEPS)

router.post('/ips/horisoes', 
    upload.single('bills'), 
    validateBillsFile,    
    validateScheme(IPSCodeScheme), 
    validateSelectedEPS, 
    botController.HorisoesFlow
)

export default router