import * as IPSService from './ips.service'
import { asyncHandler } from '@/middlewares'
import { IPSDataType } from './ips.types'


export const IPS = asyncHandler(async (_req, res) => {
    const allIPS = await IPSService.getAllIPS()

    if (!allIPS.length) return res.json({
        message: 'No se encontraron IPS',
        status: 200
    })

    return res.json({
        message: 'IPS encontradas',
        data: allIPS,
        status: 200
    })
})

export const getIPS = asyncHandler(async (req, res) => {
    const { code } = req.params

    const IPS = await IPSService.getIPSByCode(code)
    if (!IPS) return res.status(404).json({
        message: 'No se encontro ninguna IPS con el codigo proporcionado',
        status: 404
    })

    return res.json({
        message: 'IPS Encontrada',
        data: IPS,
        status: 200
    })
})

export const createIPS = asyncHandler(async (req, res) => {
    const data: IPSDataType = req.body
    const { name, code } = data

    const findIPSCode = await IPSService.getIPSByCode(code)
    const findIPSName = await IPSService.getIPSByName(name)

    if (findIPSCode || findIPSName) return res.status(409).json({
        message: findIPSCode ? 'Ya existe una IPS registrada con este codigo' :
            'Ya existe una IPS registrada con este nombre',
        status: 409
    })

    await IPSService.createIPS(data)

    return res.json({
        message: 'IPS creada exitosamente',
        status: 200
    })
})

export const updateIPS = asyncHandler(async (req, res) => {
    const { code } = req.params
    const data: IPSDataType = req.body
    const { code: comingCode, name } = data

    const findIPS = await IPSService.getIPSByCode(code)
    if (!findIPS) return res.status(404).json({
        message: 'No se encontro ninguna IPS con el codigo proporcionado',
        status: 404
    })

    const findIPSCode = await IPSService.getIPSByCode(comingCode)
    const findIPSName = await IPSService.getIPSByName(name)
    if (findIPSCode && findIPSCode.code !== findIPS.code ||
        findIPSName && findIPSName.name !== findIPS.name)
        return res.status(409).json({
            message: findIPSCode ? 'Ya existe una IPS registrada con este codigo' :
                'Ya existe una IPS registrada con este nombre',
            status: 409
        })

    await IPSService.updateIPS(code, data)

    return res.json({
        message: 'IPS actualizada exitosamente',
        status: 200
    })
})