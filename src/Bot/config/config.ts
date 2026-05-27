import { HorisoesCoosaludInitiator } from '../Workflows/horisoes-coosalud.workflow'

//* Playwright config
export const HEADLESS_BROWSER = true
export const SLOWMO_BROWSER = 10
export const DEFAULT_TIMEOUT = 30000
export const NAVIGATION_TIMEOUT = 30000

//* Workflows
export const Workflows = [
    {
        name: 'Horisoes_Coosalud_Workflow',
        ipsCode: '901749264',
        epsCode: 'EPS042',
        initiator: HorisoesCoosaludInitiator
    }
]