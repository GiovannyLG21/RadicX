import { PORT } from 'config/env'
import app from 'app'

async function main() {
    try {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`)
        })
    } catch (error) {
        console.error('Error starting the server: ' + error)
    }
}

main()