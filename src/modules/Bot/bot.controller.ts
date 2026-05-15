import { asyncHandler } from '@/middlewares'
import { IPSList } from './config/config'
import { IPSCodeType } from './bot.types'
import * as horisoesService from './Horisoes/horisoes.service'

export const availableEPS = asyncHandler(async (req, res) => {
    const data: IPSCodeType = req.body

    const IPSCode = data.code
    const availableEPS = IPSList[IPSCode]

    if (!availableEPS) return res.status(404).json({
        message: 'No se encontraron EPS disponibles',
        status: 404
    })

    return res.json({
        message: 'EPS encontradas',
        data: availableEPS,
        status: 200
    })
})

//* Horisoes
export const HorisoesBot = asyncHandler(async (req, res) => {
    const { bills }: IPSCodeType = req.body

    const IPSCode = 101
    const IPSData = IPSList[IPSCode]
    const EPSData = req.eps
    if (!IPSData || !EPSData) return res.status(400)

    const IPSBot = IPSData.bot
    const EPSBot = EPSData.bot
    try {
        const resBot = await IPSBot(EPSBot, bills)
        return res.json({
            res: resBot,
            status: 200
        })
    } catch (error: any) {
        console.error(error)
        return res.status(400).json({
            message: 'Error en la ejecucion',
            error: error.message,
            status: 400
        })
    }
})

// export const getRadicado = asyncHandler(async (req, res) => {
//     const { radicado: radicadoCode } = req.params

//     if (!radicadoCode) return res.status(400).json({
//         message: 'El numero de radicado/pre-radicado es requerido',
//         status: 400
//     })

//     const radicado = await horisoesService.getRadicadoByCode(radicadoCode)
//     if (!radicado) return res.status(404).json({
//         message: 'Radicado/pre-radicado no encontrados',
//         status: 404
//     })

//     const {
//         preradicadoCode,
//         radicadoCode: radicadoCodeData,
//         radicadoSuccess,
//         contract,
//         bills,
//         createdAt
//     } = radicado

//     const data = {
//         codigo_preradicado: preradicadoCode,
//         radicado: radicadoSuccess,
//         codigo_radicado: radicadoCodeData,
//         contrato: contract.regimen,
//         fechaRadicado: createdAt,
//         estado: null,
//         cantidad_facturas: bills.length,
//         facturas: bills.map(bill => bill.code)
//     }

//     return res.json({
//         message: 'Radicado/pre-radicado encontrado',
//         data,
//         status: 200
//     })
// })