import { HorisoesCoosaludInitiator } from './Workflows/horisoes-coosalud.workflow'

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