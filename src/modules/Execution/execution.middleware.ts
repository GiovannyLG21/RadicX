import { Request, Response, NextFunction } from 'express'
import { getFileType } from '@/utils/string'

export const validateBillsFile = (req: Request, res: Response, next: NextFunction) => {
    const file = req.file
    if (!file) return res.json({
        message: 'El archivo con los numeros de factura es requerido',
        status: 400
    })

    const fileType = getFileType(file.originalname)
    if (fileType != 'txt') return res.json({
        message: 'El archivo debe ser de formato .txt',
        status: 400
    })

    const fileContent = file.buffer.toString('utf8')
    const bills = fileContent.split('\r\n').map(bill => bill.trim())

    req.body.bills = bills
    next()
}