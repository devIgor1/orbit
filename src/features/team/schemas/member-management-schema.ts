import { z } from 'zod'

export const memberRoleSchema = z.enum(['admin', 'member'])
export const memberRoleLabels = { admin: 'Administrador', member: 'Colaborador' } as const
export const changeRoleSchema = z.object({ role: memberRoleSchema })
export const removeMemberSchema = z.object({ replacement: z.union([z.literal(''), z.uuid()]) })
export const memberDetailsSchema = z.object({
  user_id: z.uuid(), full_name: z.string().min(1), role: memberRoleSchema,
  pending_tasks: z.number().int().nonnegative(), is_last_admin: z.boolean(),
})
export const memberEventSchema = z.object({
  id: z.uuid(), workspace_id: z.uuid(), actor_id: z.uuid().nullable(), actor_name: z.string(),
  member_id: z.uuid().nullable(), member_name: z.string(), action: z.enum(['role_changed', 'removed']),
  previous_role: memberRoleSchema, new_role: memberRoleSchema.nullable(),
  reassigned_to: z.uuid().nullable(), reassigned_name: z.string().nullable(),
  affected_tasks: z.number().int().nonnegative(), created_at: z.iso.datetime({ offset: true }),
})
