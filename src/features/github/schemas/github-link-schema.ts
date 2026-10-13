import { z } from 'zod'
export const githubLinkSchema = z
  .object({
    repositoryId: z.uuid('Selecione um repositório.'),
    reference: z.string().trim().min(1, 'Selecione um PR.').max(255, 'Use até 255 caracteres.'),
  })
  .superRefine((value, context) => {
    if (!/^[1-9]\d*$/.test(value.reference) || !Number.isSafeInteger(Number(value.reference)))
      context.addIssue({
        code: 'custom',
        path: ['reference'],
        message: 'Selecione um PR válido na lista.',
      })
  })
export type GithubLinkValues = z.infer<typeof githubLinkSchema>
