import prisma from '@/config/prisma'
import { CreateRole, UpdateRole } from './role.types'

/**
 * Funcion para obtener roles
 * @return Array con los roles
 * @author Giovanny Ladino
 * @date 16-12-2025  
 */
export async function getRoles() {
    return await prisma.role.findMany()
}

/**
 * Funcion para obtener un rol por su id
 * @param id Id del rol
 * @return Objeto con los datos del rol
 * @author Giovanny Ladino
 * @date 16-12-2025  
 */
export async function getRoleById(id: string | undefined) {
    if (!id) return null
    return await prisma.role.findUnique({
        where: { id: Number(id) }
    })
}

/**
 * Funcion para obtener un rol por su nombre
 * @param name Nombre del rol
 * @return Objeto con los datos del rol
 * @author Giovanny Ladino
 * @date 16-12-2025  
 */
export async function getRoleByName(name: string) {
    return await prisma.role.findFirst({
        where: {
            name: {
                equals: name,
            }
        },
    })
}

/**
 * Funcion para crear un rol
 * @param data Datos del rol a crear
 * @return void
 * @author Giovanny Ladino
 * @date 16-12-2025  
 */
export async function createRole(data: CreateRole) {
    return await prisma.role.create({ data })
}

/**
 * Funcion para actualizar un rol
 * @param id Id del rol
 * @param data Datos nuevos del rol
 * @return void
 * @author Giovanny Ladino
 * @date 16-12-2025  
 */
export async function updateRole(id: string | undefined, data: UpdateRole) {
    if (!id) return null
    return await prisma.role.update({
        where: { id: Number(id) },
        data
    })
}

/**
 * Funcion para eliminar un role
 * @param id Id del rol
 * @return void
 * @author Giovanny Ladino
 * @date 16-12-2025  
 */
export async function deleteRole(id: string | undefined) {
    if (!id) return null
    return prisma.role.delete({
        where: { id: Number(id) }
    })
}