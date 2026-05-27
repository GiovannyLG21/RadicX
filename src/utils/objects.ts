export const getDataFromEntries = (object: Record<string, any> | undefined, position: number) => {
    return object ? Object.entries(object).map(entrie => entrie[position]) : []
}