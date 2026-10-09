import type { Database } from './database.generated'

export type { Database, Json } from './database.generated'
export type Project = Database['public']['Tables']['projects']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type TaskComment = Database['public']['Tables']['task_comments']['Row']
export type ActivityEvent = Database['public']['Tables']['activity_events']['Row']
// PostgreSQL table-returning RPC introspection omits column nullability. Inherit
// nullable profile fields from the generated table contract, not a second model.
export type TeamMember = Omit<Database['public']['Functions']['team_directory']['Returns'][number], 'avatar_url' | 'job_title'> & Pick<Profile, 'avatar_url' | 'job_title'>
export type DashboardSummary = {
  active_projects: number
  pending_tasks: number
  overdue_tasks: number
  completed_tasks: number
  total_tasks: number
  weekly: { date: string; created: number; completed: number }[]
  distribution: { status: Task['status']; count: number }[]
}
