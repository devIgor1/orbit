import { z } from 'zod'

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Informe seu nome completo.').max(100, 'Use até 100 caracteres.'),
  job_title: z.string().trim().max(100, 'Use até 100 caracteres.'),
})

export type ProfileValues = z.infer<typeof profileSchema>
