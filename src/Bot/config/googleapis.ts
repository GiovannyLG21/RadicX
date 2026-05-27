import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
    keyFile: './googleapis.credentials.json',
    scopes: ['https://www.googleapis.com/auth/drive']
})

export const drive = google.drive({
    version: 'v3',
    auth
})

export const sheets = google.sheets({
    version: 'v4',
    auth
})