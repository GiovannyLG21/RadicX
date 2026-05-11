import { asyncHandler } from '@/middlewares'
import { IPSList } from './config/config'
import { IPSCodeType } from './bot.types'

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

export const HorisoesFlow = asyncHandler(async (req, res) => {
    const { bills }: IPSCodeType = req.body

    const IPSCode = 101
    const IPSData = IPSList[IPSCode]
    const EPSData = req.eps
    if (!IPSData || !EPSData) return res.status(400)

    const IPSBot = IPSData.bot
    const EPSBot = EPSData.bot
    try {
        await IPSBot(EPSBot, bills)
        return res.json({
            message: 'Facturas radicadas',    
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