/* eslint-disable @typescript-eslint/no-unused-vars */
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CODE, GOOGLE_REFRESH_TOKEN } from '@/config/env'
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'http://localhost:8000/oauth2callback'
)

//* Generate new client
const generateUrlOAuth2 = () => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/spreadsheets'
        ]
    })
    console.log(url)
}
// generateUrlOAuth2()

const setTokenOAuth2 = async () => {
    const { tokens } = await oauth2Client.getToken(GOOGLE_CODE)
    oauth2Client.setCredentials(tokens)
    console.log(tokens)
}
// setTokenOAuth2()

oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN
})

export const drive = google.drive({
    version: 'v3',
    auth: oauth2Client
})

export const sheets = google.sheets({
    version: 'v4',
    auth: oauth2Client
})