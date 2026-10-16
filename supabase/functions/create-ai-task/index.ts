import { authenticateTaskSession } from './database.ts'
import { createAiTaskHandler } from './handler.ts'
import { generateTask } from './openai.ts'
import { AiTaskError } from './errors.ts'

function required(name: string) {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new AiTaskError('AI_NOT_CONFIGURED', 503)
  return value
}

Deno.serve(createAiTaskHandler({
  authenticate: token => authenticateTaskSession(token, required('SUPABASE_URL'), required('SUPABASE_ANON_KEY')),
  configured: () => Boolean(Deno.env.get('OPENAI_API_KEY')?.trim()),
  generate: (input, context) => generateTask(input, context, required('OPENAI_API_KEY')),
}))
