import drive from '../config/googleapis'
import { HEV_FOLDER_ID } from './config/config'
import { BillFilesType } from '../bot.types'
import prisma from '@/config/prisma'

// export async function getRadicadoByCode(code: string) {
//     return await prisma.radicados.findFirst({
//         where: {
//             OR: [
//                 { preradicadoCode: code },
//                 { radicadoCode: code }
//             ]
//         },
//         include: {
//             contract: true,
//             bills: true
//         }
//     })
// }

export async function downloadDriveFile(folderId: string, fileName: string): Promise<Buffer | undefined> {
    const res = await drive.files.list({
        q: `
            '${folderId}' in parents
            and name = '${fileName}'            
        `,
        fields: 'files(id, name, mimeType)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    })

    const files = res.data.files
    if (!files?.length) return
    const fileId = files[0]?.id as string

    const download = await drive.files.get(
        {
            fileId,
            alt: 'media',
        },
        {
            responseType: 'stream',
        }
    )

    const chunks: Buffer[] = []
    return new Promise((resolve, reject) => {
        download.data.on('data', (chunk) => {
            chunks.push(chunk)
        })
        download.data.on('end', () => {
            resolve(Buffer.concat(chunks))
        })
        download.data.on('error', reject)
    })
}

export async function getHEVFiles(billsFiles: BillFilesType[]) {
    for (const entry of billsFiles) {
        if (!entry.success) continue
        const bill = entry.bill
        const RIPSFileBuffer = entry.files.find(file => file.code == 'RIPS')!.buffer
        const RIPSfileData = RIPSFileBuffer.toString('utf-8')
        const fileDataParse = JSON.parse(RIPSfileData)

        const userDocType: string = fileDataParse['usuarios'][0]['tipoDocumentoIdentificacion']
        const userDocNum: string = fileDataParse['usuarios'][0]['numDocumentoIdentificacion']
        const userDoc = userDocType + userDocNum

        const HEVFile = await downloadDriveFile(HEV_FOLDER_ID, `${userDoc}_FRAMINGHAM_signed.pdf`)
        if (!HEVFile) {
            entry.success = false
            entry.status = 'NOT_FOUND'
            entry.message = 'HEV no encontrado'
            continue
        }

        entry.message = 'Factura, RIPS & HEV descargados'
        entry.files.push({
            code: 'HEV',
            name: `HEV_901011395_${bill}.pdf`,
            buffer: HEVFile
        })
    }

    return billsFiles
}