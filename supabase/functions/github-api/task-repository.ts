import { confirmed, requireMember, type GithubDatabase } from '../_shared/github/database.ts'

type TaskRepositoryInput = { workspaceId: string; taskId: string; repositoryId: string }

/** Resolve authority from the task/project relationship before contacting GitHub. */
export async function taskRepository(db: GithubDatabase, userId: string, input: TaskRepositoryInput) {
  await requireMember(db, userId, input.workspaceId)
  const task = confirmed(
    await db.from('tasks').select('project_id').eq('workspace_id', input.workspaceId).eq('id', input.taskId).single(),
  )
  confirmed(
    await db
      .from('project_github_repositories')
      .select('repository_id')
      .eq('workspace_id', input.workspaceId)
      .eq('project_id', task.project_id)
      .eq('repository_id', input.repositoryId)
      .single(),
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
