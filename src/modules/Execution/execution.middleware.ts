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

    const fileContent = file.buffer
        .toString('utf-8')
        .replace(/[^\x20-\x7E\n\r\t]/g, '')

    const bills = fileContent
        .split(/\r\n|\n|\r/)
        .map(bill => bill.trim())
        .filter(bill => Boolean(bill) && bill.length == 9)

    if (bills.length < 100) return res.status(400).json({
        message: 'El archivo debe tener minimo 100 facturas.',
        status: 400
    })

    req.body.bills = bills
    
    next()
}