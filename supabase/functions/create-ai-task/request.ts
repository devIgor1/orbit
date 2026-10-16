import { AiTaskError } from './errors.ts'

export async function readTaskRequest(request: Request): Promise<unknown> {
  const reader = request.body?.getReader()
  if (!reader) throw new AiTaskError('AI_INVALID_REQUEST', 400)
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > 16_000) {
        await reader.cancel()
        throw new AiTaskError('AI_INVALID_REQUEST', 400)
      }
      text += decoder.decode(chunk.value, { stream: true })
    }
    text += decoder.decode()
    return JSON.parse(text)
  } catch { throw new AiTaskError('AI_INVALID_REQUEST', 400) }
  finally { reader.releaseLock() }
}
