
export const getDateTime = (date: Date | null | undefined) => {
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

export function formatDate(date: Date | null): string {
    if (!date) return ''
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
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export function getDateTimeDiff(startDate: Date | null, finishDate: Date | null) {
    if (!startDate || !finishDate) return ''

    const msDiff = finishDate.getTime() - startDate.getTime()
    const hoursDiff = Number((msDiff / (1000 * 60 * 60)).toFixed(4))
    const minutesDiff = Math.abs(hoursDiff % 1) * 60
    const secondsDiff = Math.abs(minutesDiff % 1) * 60

    let hours = Math.trunc(hoursDiff)
    let minutes = Math.trunc(minutesDiff)
    let seconds = Math.round(secondsDiff)

    if (minutes == 60) {
        minutes = 0
        hours++
    }
    if (seconds == 60) {
        seconds = 0
        minutes++
    }

    return `${String(hours).padStart(2, '0')}h:${String(minutes).padStart(2, '0')}m:${String(seconds).padStart(2, '0')}s`
}