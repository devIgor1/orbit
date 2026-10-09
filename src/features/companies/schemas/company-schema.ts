import { z } from 'zod'

export const companySchema = z.object({
  name: z.string().trim().min(2, 'Informe pelo menos 2 caracteres.').max(100, 'Use até 100 caracteres.'),
})
export type CompanyValues = z.infer<typeof companySchema>
export const invitationSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email('Informe um e-mail válido.')),
})
export type InvitationValues = z.infer<typeof invitationSchema>
