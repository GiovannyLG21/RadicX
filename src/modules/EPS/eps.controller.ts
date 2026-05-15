import { asyncHandler } from '@/middlewares'
import { EPSDataType } from './eps.types'
import * as EPSService from './eps.service'


export const EPS = asyncHandler(async (_req, res) => {
    const allEPS = await EPSService.getAllEPS()

    if (!allEPS.length) return res.json({
        message: 'No se encontraron EPS',
        status: 200
    })

    return res.json({
        message: 'EPS encontradas',
        data: allEPS,
        status: 200
    })
})

export const getEPS = asyncHandler(async (req, res) => {
    const { code } = req.params

    const EPS = await EPSService.getEPSByCode(code)
    if (!EPS) return res.status(404).json({
        message: 'No se encontro ninguna EPS con el codigo proporcionado',
        status: 404
    })

    return res.json({
        message: 'EPS Encontrada',
        data: EPS,
        status: 200
    })
})

export const createEPS = asyncHandler(async (req, res) => {
    const data: EPSDataType = req.body
    const { name, code } = data

    const findEPSCode = await EPSService.getEPSByCode(code)
    const findEPSName = await EPSService.getEPSByName(name)

    if (findEPSCode || findEPSName) return res.status(409).json({
        message: findEPSCode ? 'Ya existe una EPS registrada con este codigo' :
            'Ya existe una EPS registrada con este nombre',
        status: 409
    })

    await EPSService.createEPS(data)

    return res.json({
        message: 'EPS creada exitosamente',
        status: 200
    })
})

export const updateEPS = asyncHandler(async (req, res) => {
    const { code } = req.params
    const data: EPSDataType = req.body
    const { code: comingCode, name } = data

    const findEPS = await EPSService.getEPSByCode(code)
    if (!findEPS) return res.status(404).json({
        message: 'No se encontro ninguna EPS con el codigo proporcionado',
        status: 404
    })

    const findEPSCode = await EPSService.getEPSByCode(comingCode)
    const findEPSName = await EPSService.getEPSByName(name)
    if (findEPSCode && findEPSCode.code !== findEPS.code ||
        findEPSName && findEPSName.name !== findEPS.name)
        return res.status(409).json({
            message: findEPSCode ? 'Ya existe una EPS registrada con este codigo' :
                'Ya existe una EPS registrada con este nombre',
            status: 409
        })

    await EPSService.updateEPS(code, data)

    return res.json({
        message: 'EPS actualizada exitosamente',
        status: 200
    })
})