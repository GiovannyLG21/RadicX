import { Request, Response, NextFunction } from 'express'
import { WorkflowType } from '@/Bot/types'
import * as IPSService from '@/modules/IPS/ips.service'
import * as EPSService from '@/modules/EPS/eps.service'

/**
 * Middleware para la validacion del workflow del endpoint.
 * @param Workflow Workflow del endpoint perteneciente a la lista 'Workflow' definida en 'config'
 */
export const validateWorkflow = (Workflow: WorkflowType) => async (req: Request, res: Response, next: NextFunction) => {
    const ipsCode = Workflow.ipsCode
    const epsCode = Workflow.epsCode

    //* Find IPS/EPS
    const IPSData = await IPSService.getIPSByCode(ipsCode)
    const EPSData = await EPSService.getEPSByCode(epsCode)

    if (!IPSData || !EPSData) return res.status(404).json({
        message: !IPSData ? 'No se encontro la IPS proporcionada' : 'No se encontro la EPS proporcionada',
        status: 404
    })

    if (!req.body) {
        req.body = { workflow: Workflow }
        return next()
    }

    req.body.workflow = Workflow

    next()
}