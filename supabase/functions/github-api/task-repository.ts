import { confirmed, requireMember, type GithubDatabase } from '../_shared/github/database.ts'

type TaskRepositoryInput = { workspaceId: string; taskId: string; repositoryId: string }

/** Both the task and the selected repository must belong to the member's workspace. */
export async function taskRepository(db: GithubDatabase, userId: string, input: TaskRepositoryInput) {
  await requireMember(db, userId, input.workspaceId)
  confirmed(
    await db.from('tasks').select('project_id').eq('workspace_id', input.workspaceId).eq('id', input.taskId).single(),
  )
  return confirmed(
    await db
      .from('github_repositories')
      .select('*')
      .eq('workspace_id', input.workspaceId)
      .eq('id', input.repositoryId)
      .eq('active', true)
      .single(),
  )
}
