import z from 'zod'
import RoleScheme from './role.scheme'

export type CreateRole = z.infer<typeof RoleScheme>
export type UpdateRole = CreateRole