import z from 'zod'
import HorisoesBot from '@/Bot/IPS/Horisoes'

export const HorisoesCoosaludScheme = z.object({
    service: z
        .string()
        .min(1, {
            message: 'El nombre del servicio es requerido'
        })
        .refine(val => {
            const HorisoesServices = HorisoesBot.availableServices         
            return HorisoesServices[val.toUpperCase() as keyof typeof HorisoesServices]
        },
            {
                message: 'Servicio no encontrado'
            })
        .transform(val => val.toUpperCase())
})

