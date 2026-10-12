import { required } from '../_shared/github/config.ts'
import { adminClient, confirmed } from '../_shared/github/database.ts'
import { createWebhookHandler } from './handler.ts'
Deno.serve(
  createWebhookHandler(
    () => required('GITHUB_WEBHOOK_SECRET'),
    async (delivery, eventName, event) =>
      confirmed(await adminClient().rpc('receive_github_event', { delivery, event_name: eventName, event })),
  ),
)
