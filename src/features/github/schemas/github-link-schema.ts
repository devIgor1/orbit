import { z } from 'zod'
export const githubLinkSchema = z
  .object({
    kind: z.enum(['branch', 'pr']),
    reference: z.string().trim().min(1, 'Informe a branch ou o número do PR.').max(255, 'Use até 255 caracteres.'),
  })
  .superRefine((value, context) => {
    if (value.kind === 'pr' && (!/^[1-9]\d*$/.test(value.reference) || !Number.isSafeInteger(Number(value.reference))))
      context.addIssue({
        code: 'custom',
        path: ['reference'],
        message: 'Informe somente o número do PR, por exemplo 42.',
      })
  })
export type GithubLinkValues = z.infer<typeof githubLinkSchema>
