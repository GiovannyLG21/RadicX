import drive from './config/googleapis'

export const downloadDriveFile = async (folderId: string, fileName: string): Promise<Buffer | undefined> => {
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