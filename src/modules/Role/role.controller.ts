import { asyncHandler } from '@/middlewares'
import { CreateRole, UpdateRole } from './role.types'
import * as roleService from './role.service'

export const roles = asyncHandler(async (_req, res) => {
    const roles = await roleService.getRoles()

    if (!roles.length) return res.json({
        message: 'No se encontraron roles',
        status: 200
    })

    return res.json({
        message: 'Roles encontrados',
        data: roles,
        status: 200
    })
})

export const getRole = asyncHandler(async (req, res) => {
    const { id } = req.params

    const role = await roleService.getRoleById(id)
    if (!role) return res.status(404).json({
        message: 'No se encontro el rol',
        status: 404
    })

    return res.json({
        message: 'Rol encontrado',
        data: role,
        status: 200
    })
})

export const createRole = asyncHandler(async (req, res) => {
    const data: CreateRole = req.body

    const findRole = await roleService.getRoleByName(data.name)
    if (findRole) return res.status(409).json({
        message: 'Ya existe un rol con este nombre',
        status: 409
    })

    const newRole = await roleService.createRole(data)

    return res.json({
        message: 'Rol creado exitosamente',
        data: newRole,
        status: 200
    })
})

export const updateRole = asyncHandler(async (req, res) => {
    const { id } = req.params
    const data: UpdateRole = req.body

    const findRole = await roleService.getRoleById(id)
    if (!findRole) return res.status(404).json({
        message: 'No se encontro el rol',
        status: 404
    })

    const findExistingRole = await roleService.getRoleByName(data.name)
    if (findExistingRole && findExistingRole.id !== Number(id)) return res.status(409).json({
        message: 'Ya existe un rol con este nombre',
        status: 409
    })

    await roleService.updateRole(id, data)

    return res.json({
        message: 'Rol actualizado correctamente',
        status: 200
    })
})

export const deleteRole = asyncHandler(async (req, res) => {
    const { id } = req.params

    const findRole = await roleService.getRoleById(id)
    if (!findRole) return res.status(404).json({
        message: 'No se encontro el rol',
        status: 404
    })

    await roleService.deleteRole(id)

    return res.json({
        message: 'Rol eliminado correctamente',
        status: 200
    })
})