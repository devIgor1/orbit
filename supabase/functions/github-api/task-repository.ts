import { confirmed, requireMember, type GithubDatabase } from '../_shared/github/database.ts'
import { GithubError } from '../_shared/github/errors.ts'

type TaskRepositoryInput = { workspaceId: string; taskId: string; repositoryId: string }

/** The repository must be the one linked to the task's project, in the member's workspace. */
export async function taskRepository(db: GithubDatabase, userId: string, input: TaskRepositoryInput) {
  await requireMember(db, userId, input.workspaceId)
  // Items in the trash are not available for GitHub work.
  const task = confirmed(
    await db
      .from('tasks')
      .select('project_id')
      .eq('workspace_id', input.workspaceId)
      .eq('id', input.taskId)
      .is('deleted_at', null)
      .single(),
  )
  confirmed(
    await db
      .from('projects')
      .select('id')
      .eq('workspace_id', input.workspaceId)
      .eq('id', task.project_id)
      .is('deleted_at', null)
      .single(),
  )
  const project = await db
    .from('project_github_repositories')
    .select('repository_id')
    .eq('workspace_id', input.workspaceId)
    .eq('project_id', task.project_id)
    .maybeSingle()
  if (project.error) throw project.error
  if (project.data?.repository_id !== input.repositoryId)
    throw new GithubError('GITHUB_PROJECT_REPOSITORY_REQUIRED', 400)
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
