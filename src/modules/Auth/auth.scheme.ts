import { capitalize, lowerCase } from '@/utils'
import z from 'zod'

export const loginScheme = z.object({
    username: z.
        string()
        .min(1, { error: "El nombre de usuario es requerido" })
        .transform(lowerCase),
    password: z.
        string()
        .min(1, { error: "La contraseña es requerida" })

})

export const registerScheme = z.object({
    names: z
        .string({
            error: "El nombre es requerido"
        })
        .min(3, {
            error: "El nombre debe tener minimo 3 caracteres"
        })
        .max(50, {
            error: "El nombre debe tener maximo 50 caracteres"
        })
        .transform(capitalize),
    lastnames: z
        .string({
            error: "El nombre es requerido"
        })
        .min(3, {
            error: "El nombre debe tener minimo 3 caracteres"
        })
        .max(50, {
            error: "El nombre debe tener maximo 50 caracteres"
        })
        .transform(capitalize),
    username: z
        .string({
            error: "El nombre de usuario es requerido"
        })
        .min(5, {
            error: "El nombre de usuario debe tener minimo 5 caracteres"
        })
        .max(50, {
            error: "El nombre de usuario debe tener maximo 50 caracteres"
        })
        .transform(lowerCase),
    email: z
        .email({
            error: "Ingrese un correo electronico valido"
        })
        .transform(lowerCase),
    password: z
        .string({
            error: "La constraseña es requerida"
        })
        .min(8, {
            error: "La contraseña debe tener minimo 8 caracteres"
        })
        .max(24, {
            error: "La contraseña debe tener maximo 24 caracteres"
        })
})