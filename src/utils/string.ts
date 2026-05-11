
export const capitalize = (string: string) => {
    return string.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
}

export const lowerCase = (string: string) => {
    return string.trim().toLowerCase()
}

export const isValidDate = (date: string) => {
    return !isNaN(Date.parse(date))
}