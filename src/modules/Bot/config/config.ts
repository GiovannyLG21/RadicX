import { EPSListType, IPSListType } from '../bot.types'
import CoosaludBot from '../EPS/CoosaludBot'
import HorisoesFlow from '../Horisoes'

//* Config
export const HEADLESS_BROWSER = false
export const SLOWMO_BROWSER = 10
export const DEFAULT_TIMEOUT = 10000
export const NAVIGATION_TIMEOUT = 20000


//* EPS
export const EPSList: Record<string, EPSListType> = {
    '01': {
        code: '01',
        name: 'COOSALUD ENTIDAD PROMOTORA DE SALUD S.A',
        bot: CoosaludBot
    },
    '02': {
        code: '02',
        name: 'NUEVA EPS',
        bot: CoosaludBot
    }
}


//* IPS
export const IPSList: IPSListType = {
    '101': {
        code: '101',
        name: 'IPS HORIZONTE SOCIAL LA ESPERANZA SAS',
        shortname: 'Horisoes',
        bot: HorisoesFlow,
        EPS: [
            EPSList['01']!
        ]
    }
}