export const capitalize = (string: string) => {
    return string.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export const lowerCase = (string: string) => {
    return string.trim().toLowerCase()
}

export const getFileType = (filename: string) => {
    return filename.split('.')[1]
}