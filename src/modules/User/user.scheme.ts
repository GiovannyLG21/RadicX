import z from 'zod'

const userScheme = z.object({
    names: z
        .string({
            error: "El nombre es requerido"
        })
        .min(3, {
            error: "El nombre debe tener minimo 3 caracteres"
        })
        .max(50, {
            error: "El nombre debe tener maximo 50 caracteres"
        }),
    lastnames: z
        .string({
            error: "El nombre es requerido"
        })
        .min(3, {
            error: "El nombre debe tener minimo 3 caracteres"
        })
        .max(50, {
            error: "El nombre debe tener maximo 50 caracteres"
        }),
    username: z
        .string({
            error: "El nombre de usuario es requerido"
        })
        .min(5, {
            error: "El nombre de usuario debe tener minimo 5 caracteres"
        })
        .max(50, {
            error: "El nombre de usuario debe tener maximo 50 caracteres"
        }),
    email: z
        .email({
            error: "Ingrese un correo electronico valido"
        }),
    password: z
        .string({
            error: "La constraseña es requerida"
        })
        .min(8, {
            error: "La contraseña debe tener minimo 8 caracteres"
        })
        .max(24, {
            error: "La contraseña debe tener maximo 24 caracteres"
        }),
})

export default userScheme