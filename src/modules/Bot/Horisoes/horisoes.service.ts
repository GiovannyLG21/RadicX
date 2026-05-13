import Client from 'ssh2-sftp-client'
import drive from '../config/googleapis'
import { HEV_FOLDER_ID, SFTP_CREDENTIALS } from './config/config'
import { BillFilesType, RadicacionCodesType } from '../bot.types'

export async function sftpUpload(radicacionCodes: RadicacionCodesType | undefined, billsFiles: BillFilesType[]) {
    if (!radicacionCodes) return
    const sftp = new Client()
    try {
        await sftp.connect({
            host: 'vco.ctamedicas.com',
            port: 22,
            username: SFTP_CREDENTIALS.user,
            password: SFTP_CREDENTIALS.password
        })

        for (const entry of billsFiles) {
            if (!entry.success) continue
            const radicacionCode = radicacionCodes.find(radicacion => radicacion.contract == entry.contract)!.code
            const bill = entry.bill
            const IMGFiles = entry.files.filter(file => file.code == 'XML' || file.code == 'FEV' || file.code == 'HEV')
            const RIPSFiles = entry.files.filter(file => file.code == 'CUV' || file.code == 'RIPS')

            for (const file of RIPSFiles) {
                await sftp.put(file.buffer, `/${radicacionCode}/RIPS/${file.name}`)
            }

            const actualDirectory = await sftp.exists(`/${radicacionCode}/IMG/${bill}`)
            if (!actualDirectory) await sftp.mkdir(`/${radicacionCode}/IMG/${bill}`)
            for (const file of IMGFiles) {
                await sftp.put(file.buffer, `/${radicacionCode}/IMG/${bill}/${file.name}`)
            }
            entry.message = 'Factura, RIPS & HEV cargados en sftp'
        }
    } catch (error) {
        console.error(error)
        return
    } finally {
        await sftp.end()
    }
}

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
        if(!fileDataParse) {
            const files = entry.files.map(({ buffer, ...data }) => data)
            console.log(bill, files, Boolean(RIPSFileBuffer), RIPSfileData, fileDataParse)
            entry.success = false
            entry.status = 'NOT_FOUND'
            entry.message = 'Paciente no encontrado al descargar HEV'
            continue
        }
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
            name: `HEV_901011395_${bill}`,
            buffer: HEVFile
        })
    }

    return billsFiles
}