/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Funcion para extraer los datos de un objeto, convirtiendolo en [clave, valor].
 * @param object Objeto del cual se extraeran los datos
 * @param position Posicion de los datos
 */
export const getDataFromEntries = (object: Record<string, any> | undefined, position: number) => {
    return object ? Object.entries(object).map(entrie => entrie[position]) : []
}