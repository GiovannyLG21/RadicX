import * as botService from '../../bot.service'
import { BillFilesType } from "../../bot.types";
import { HEV_FOLDER_ID } from '../config/config';

class HEVPage {

    getUserDoc(RIPSFileBuffer: Buffer<ArrayBufferLike>) {
        const fileData = RIPSFileBuffer.toString('utf-8')
        const fileDataParse = JSON.parse(fileData)
        const userDocType: string = fileDataParse['usuarios'][0]['tipoDocumentoIdentificacion']
        const userDocNum: string = fileDataParse['usuarios'][0]['numDocumentoIdentificacion']
        const userDoc = userDocType + userDocNum
        return userDoc
    }

    async getFile(userDoc: string) {
        return await botService.downloadDriveFile(HEV_FOLDER_ID, `${userDoc}_FRAMINGHAM_signed.pdf`)
    }
}

async function HEVFlow(billsFiles: BillFilesType[]) {
    const hevPage = new HEVPage()

    for (const entry of billsFiles) {
        const bill = entry.bill
        const RIPSFileBuffer = entry.files.find(file => file.name == `${bill}.json`)!.buffer

        const userDoc = hevPage.getUserDoc(RIPSFileBuffer)
        const HEVFile = await hevPage.getFile(userDoc)
        if (!HEVFile) continue

        entry.files.push({
            code: 'HEV',
            name: `HEV_901011395_${bill}`,
            buffer: HEVFile
        })
    }

    return billsFiles
}

export default HEVFlow