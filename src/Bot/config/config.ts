import { HorisoesCoosaludInitiator } from '../Workflows/horisoes-coosalud.workflow'

//* Playwright config
export const HEADLESS_BROWSER = true
export const SLOWMO_BROWSER = 10
export const DEFAULT_TIMEOUT = 30000
export const NAVIGATION_TIMEOUT = 30000

//* Workflows

/**
 * Objeto con los workflows de cada IPS.
 */
export const Workflows = {
    HorisoesCoosaludWorkflow: {
        name: 'Horisoes_Coosalud_Workflow',
        ipsCode: '901749264',
        epsCode: 'EPS042',
        initiator: HorisoesCoosaludInitiator
    },
    HorisoesNuevaEpsWorkflow: {
        name: 'Horisoes_NuevaEPS_Workflow',
        ipsCode: '901749264',
        epsCode: 'epsCode',
        initiator: HorisoesCoosaludInitiator
    }
}