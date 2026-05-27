import { z } from 'zod'
import { capitalize } from '@/utils'

const RoleSchema = z.object({
    name: z
        .string({
            error: "El nombre del rol es requerido"
        })
        .min(5, {
            error: "El rol debe tener minimo 5 caracteres"
        })
        .max(25, {
            error: "El rol debe tener maximo 25 caracteres"
        })
        .transform(capitalize)
})

export default RoleSchema