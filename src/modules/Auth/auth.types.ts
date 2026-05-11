import z from 'zod'
import { loginScheme, registerScheme } from './auth.scheme'

export type Login = z.infer<typeof loginScheme>
export type Register = z.infer<typeof registerScheme>
export type { User } from '@/modules/User/user.types'
