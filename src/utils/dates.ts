
export const getDateTime = (date: Date | null) => {
    const config: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }

    if (date) return date.toLocaleString('sv-SE').replace(',', '')
    return new Date().toLocaleString('sv-SE').replace(',', '')
}

export const isValidDate = (date: string) => {
    return !isNaN(Date.parse(date))
}

export function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
}

export function formatExecutionDate(date: Date | null): string {
    if (!date) return ''
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}