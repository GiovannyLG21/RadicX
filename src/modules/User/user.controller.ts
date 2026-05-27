import { Request, Response } from 'express';
import * as userService from './user.service'
import { asyncHandler } from '@/middlewares';
import { CreateUser } from './user.types';

export const users = asyncHandler(async (_req, res) => {
    const users = await userService.users()

    if (!users.length) return res.json({
        message: 'No se encontraron usuarios',
        status: 200
    })

    return res.json({
        message: 'Usuarios encontrados',
        data: users,
        status: 200
    })
})

export const getUser = asyncHandler(async (req, res) => {
    const { id } = req.params

    const user = await userService.getUserById(id)
    if (!user) return res.json({
        message: 'No se encontro el usuario',
        status: 200
    })

    return res.json({
        message: 'Usuario encontrado',
        data: user,
        status: 200
    })
})

export const createUser = asyncHandler(async (req, res) => {
    const data: CreateUser = req.body
    const { email, username } = data

    const findUser = await userService.getUser(email, username)
    if (findUser) return res.status(409).json({
        message: findUser.email == email ? 'Ya existe un usuario con este correo electronico'
            : 'Ya existe un usuario con este nombre de usuario',
        status: 409
    })

    await userService.createUser(data)

    return res.json({
        message: 'Usuario creado exitosamente',
        status: 200
    })
})