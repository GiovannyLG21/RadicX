import { NextFunction, Request, Response } from 'express'
import { NODE_ENV } from '@/config/env'
import { getFileType } from '@/utils/string'

//* HorisoesCoosalud
/**
 *  Middleware para validar el archivo de las facturas cargado, accediendo a 'req.file'.
 */
export const validateBillsFile = (req: Request, res: Response, next: NextFunction) => {
    const file = req.file
    if (!file) return res.status(400).json({
        message: 'El archivo con los numeros de factura es requerido',
        status: 400
    })

    const fileType = getFileType(file.originalname)
    if (fileType != 'txt') return res.json({
        message: 'El archivo debe ser de formato .txt',
        status: 400
    })

    const fileContent = file.buffer
        .toString('utf-8')
        .replace(/[^\x20-\x7E\n\r\t]/g, '')

    const bills = fileContent
        .split(/\r\n|\n|\r/)
        .map(bill => bill.trim())
        .filter(bill => Boolean(bill) && bill.length == 10)

    if (bills.length < 100 && NODE_ENV !== 'development') return res.status(400).json({
        message: 'El archivo debe tener minimo 100 facturas.',
        status: 400
    })

    req.body.bills = bills

    next()
}