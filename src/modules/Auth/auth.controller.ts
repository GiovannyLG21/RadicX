import { asyncHandler } from '@/middlewares'
import { Login, Register } from './auth.types'
import { comparePassword } from '@/utils'
import * as userService from '@/modules/User/user.service'
import * as authService from './auth.service'
import { NODE_ENV } from '@/config/env'

export const login = asyncHandler(async (req, res) => {
    const data: Login = req.body
    const { username, password } = data

    const findUser = await userService.getUser('', username)
    if (!findUser) return res.status(404).json({
        message: 'No se encontro el usuario',
        status: 404
    })

    const validPassword = await comparePassword(password, findUser.password)
    if (!validPassword) return res.status(401).json({
        message: 'Contraseña incorrecta',
        status: 401
    })

    if (!findUser.isActive) return res.status(401).json({
        message: 'Este usuario ha sido inhabilitado. Por favor comuniquese con administracion',
        status: 403
    })

    const token = await authService.createSession(findUser)

    return res.
        cookie("token", token, {
            sameSite: "strict",
            httpOnly: true,
            secure: NODE_ENV === 'production' ? true : false
        })
        .json({
            message: 'Sesion creada exitosamente',
            token,
            user: {
                username,
                email: findUser.email,
                role: findUser.role.name
            }
        })
})

export const register = asyncHandler(async (req, res) => {
    const data: Register = req.body
    const { email, username } = data

    const findUser = await userService.getUser(email, username)
    if (findUser) return res.status(409).json({
        message: findUser.email == email ? 'Ya existe un usuario con este correo electronico' :
            'Ya existe un usuario con este nombre de usuarioX',
        status: 409
    })

    await authService.registerUser(data)

    return res.json({
        message: 'Usuario registrado exitosamente',
        status: 200
    })
})

export const logout = asyncHandler(async (req, res) => res.clearCookie("token").status(204))