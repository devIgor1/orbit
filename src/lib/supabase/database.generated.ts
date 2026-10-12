export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: { Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: Database['public']['Enums']['activity_entity']
          id: string
          project_id: string | null
          task_id: string | null
          title: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: Database['public']['Enums']['activity_entity']
          id?: string
          project_id?: string | null
          task_id?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: Database['public']['Enums']['activity_entity']
          id?: string
          project_id?: string | null
          task_id?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_events_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_events_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_events_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      github_repositories: {
        Row: {
          active: boolean
          connected_by: string
          created_at: string
          default_branch: string
          full_name: string
          github_id: number
          id: string
          installation_id: number
          is_private: boolean
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          connected_by: string
          created_at?: string
          default_branch: string
          full_name: string
          github_id: number
          id?: string
          installation_id: number
          is_private: boolean
          workspace_id: string
        }
        Update: {
          active?: boolean
          connected_by?: string
          created_at?: string
          default_branch?: string
          full_name?: string
          github_id?: number
          id?: string
          installation_id?: number
          is_private?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'github_repositories_connected_by_fkey'
            columns: ['connected_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'github_repositories_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          active_workspace_id: string | null
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          job_title: string | null
        }
        ComputedFields: never
        Insert: {
          active_workspace_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          job_title?: string | null
        }
        Update: {
          active_workspace_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          job_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_active_workspace_id_fkey'
            columns: ['active_workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      project_github_repositories: {
        Row: {
          project_id: string
          repository_id: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          project_id: string
          repository_id: string
          workspace_id: string
        }
        Update: {
          project_id?: string
          repository_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_github_repositories_workspace_id_project_id_fkey'
            columns: ['workspace_id', 'project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['workspace_id', 'id']
          },
          {
            foreignKeyName: 'project_github_repositories_workspace_id_repository_id_fkey'
            columns: ['workspace_id', 'repository_id']
            isOneToOne: false
            referencedRelation: 'github_repositories'
            referencedColumns: ['workspace_id', 'id']
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          status: Database['public']['Enums']['project_status']
          title: string
          updated_at: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database['public']['Enums']['project_status']
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database['public']['Enums']['project_status']
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_workspace_id_created_by_fkey'
            columns: ['workspace_id', 'created_by']
            isOneToOne: false
            referencedRelation: 'workspace_members'
            referencedColumns: ['workspace_id', 'user_id']
          },
          {
            foreignKeyName: 'projects_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          task_id: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          task_id: string
          workspace_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          task_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_comments_workspace_id_author_id_fkey'
            columns: ['workspace_id', 'author_id']
            isOneToOne: false
            referencedRelation: 'workspace_members'
            referencedColumns: ['workspace_id', 'user_id']
          },
          {
            foreignKeyName: 'task_comments_workspace_id_task_id_fkey'
            columns: ['workspace_id', 'task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['workspace_id', 'id']
          },
        ]
      }
      task_github_links: {
        Row: {
          branch: string
          comment_id: number | null
          comment_status: string
          created_at: string
          created_by: string
          head_repository_id: number
          id: string
          last_error_code: string | null
          last_synced_at: string | null
          merged_at: string | null
          pr_number: number | null
          pr_state: string
          pr_title: string | null
          project_id: string
          repository_id: string
          sync_status: string
          task_id: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          branch: string
          comment_id?: number | null
          comment_status?: string
          created_at?: string
          created_by: string
          head_repository_id: number
          id?: string
          last_error_code?: string | null
          last_synced_at?: string | null
          merged_at?: string | null
          pr_number?: number | null
          pr_state?: string
          pr_title?: string | null
          project_id: string
          repository_id: string
          sync_status?: string
          task_id: string
          workspace_id: string
        }
        Update: {
          branch?: string
          comment_id?: number | null
          comment_status?: string
          created_at?: string
          created_by?: string
          head_repository_id?: number
          id?: string
          last_error_code?: string | null
          last_synced_at?: string | null
          merged_at?: string | null
          pr_number?: number | null
          pr_state?: string
          pr_title?: string | null
          project_id?: string
          repository_id?: string
          sync_status?: string
          task_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_github_links_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_github_links_workspace_id_project_id_repository_id_fkey'
            columns: ['workspace_id', 'project_id', 'repository_id']
            isOneToOne: false
            referencedRelation: 'project_github_repositories'
            referencedColumns: ['workspace_id', 'project_id', 'repository_id']
          },
          {
            foreignKeyName: 'task_github_links_workspace_id_task_id_fkey'
            columns: ['workspace_id', 'task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['workspace_id', 'id']
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database['public']['Enums']['task_priority']
          project_id: string
          status: Database['public']['Enums']['task_status']
          title: string
          updated_at: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database['public']['Enums']['task_priority']
          project_id: string
          status?: Database['public']['Enums']['task_status']
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database['public']['Enums']['task_priority']
          project_id?: string
          status?: Database['public']['Enums']['task_status']
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_workspace_id_assignee_id_fkey'
            columns: ['workspace_id', 'assignee_id']
            isOneToOne: false
            referencedRelation: 'workspace_members'
            referencedColumns: ['workspace_id', 'user_id']
          },
          {
            foreignKeyName: 'tasks_workspace_id_created_by_fkey'
            columns: ['workspace_id', 'created_by']
            isOneToOne: false
            referencedRelation: 'workspace_members'
            referencedColumns: ['workspace_id', 'user_id']
          },
          {
            foreignKeyName: 'tasks_workspace_id_project_id_fkey'
            columns: ['workspace_id', 'project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['workspace_id', 'id']
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          email: string
          email_job_id: string | null
          email_requested_at: string | null
          email_sent_at: string | null
          email_status: string
          expires_at: string
          id: string
          status: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          email_job_id?: string | null
          email_requested_at?: string | null
          email_sent_at?: string | null
          email_status?: string
          expires_at?: string
          id?: string
          status?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          email_job_id?: string | null
          email_requested_at?: string | null
          email_sent_at?: string | null
          email_status?: string
          expires_at?: string
          id?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_invitations_accepted_by_fkey'
            columns: ['accepted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_invitations_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_invitations_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_member_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          affected_tasks: number
          created_at: string
          id: string
          member_id: string | null
          member_name: string
          new_role: Database['public']['Enums']['member_role'] | null
          previous_role: Database['public']['Enums']['member_role']
          reassigned_name: string | null
          reassigned_to: string | null
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          action: string
          actor_id?: string | null
          actor_name: string
          affected_tasks?: number
          created_at?: string
          id?: string
          member_id?: string | null
          member_name: string
          new_role?: Database['public']['Enums']['member_role'] | null
          previous_role: Database['public']['Enums']['member_role']
          reassigned_name?: string | null
          reassigned_to?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          affected_tasks?: number
          created_at?: string
          id?: string
          member_id?: string | null
          member_name?: string
          new_role?: Database['public']['Enums']['member_role'] | null
          previous_role?: Database['public']['Enums']['member_role']
          reassigned_name?: string | null
          reassigned_to?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_member_events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_member_events_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_member_events_reassigned_to_fkey'
            columns: ['reassigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_member_events_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          removed_at: string | null
          role: Database['public']['Enums']['member_role']
          user_id: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          removed_at?: string | null
          role?: Database['public']['Enums']['member_role']
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          removed_at?: string | null
          role?: Database['public']['Enums']['member_role']
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { invitation_id: string }; Returns: string }
      apply_github_snapshot: { Args: { job_lease: string; snapshot: Json; target_link: string }; Returns: Json }
      begin_github_connection: {
        Args: { repository_name: string; requester: string; state_hash: string; target_workspace: string }
        Returns: undefined
      }
      change_member_role: {
        Args: {
          expected_role: Database['public']['Enums']['member_role']
          new_role: Database['public']['Enums']['member_role']
          target_user: string
          target_workspace: string
        }
        Returns: {
          action: string
          actor_id: string | null
          actor_name: string
          affected_tasks: number
          created_at: string
          id: string
          member_id: string | null
          member_name: string
          new_role: Database['public']['Enums']['member_role'] | null
          previous_role: Database['public']['Enums']['member_role']
          reassigned_name: string | null
          reassigned_to: string | null
          workspace_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'workspace_member_events'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_registration_email: {
        Args: { candidate_email: string }
        Returns: Database['public']['Enums']['registration_email_status']
      }
      claim_github_jobs: { Args: Record<PropertyKey, never>; Returns: Json }
      consume_github_connection: { Args: { requester: string; state_hash: string }; Returns: Json }
      create_company: {
        Args: { company_name: string }
        Returns: {
          created_at: string
          id: string
          name: string
        }
        SetofOptions: {
          from: '*'
          to: 'workspaces'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dashboard_summary: { Args: { period_days?: number; target_workspace: string }; Returns: Json }
      disconnect_github_repository: { Args: { target_repository: string; target_workspace: string }; Returns: string }
      finish_github_connection: {
        Args: { repository: Json; requester: string; target_workspace: string }
        Returns: string
      }
      finish_github_job: {
        Args: {
          failure_code?: string
          job_generation: number
          job_lease: string
          sent_comment_id?: number
          target_link: string
        }
        Returns: string
      }
      finish_invitation_email: { Args: { delivery_id: string; message_id?: string }; Returns: string }
      invite_collaborator: {
        Args: { invite_email: string; target_workspace: string }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          email: string
          email_job_id: string | null
          email_requested_at: string | null
          email_sent_at: string | null
          email_status: string
          expires_at: string
          id: string
          status: string
          workspace_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'workspace_invitations'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      link_task_github: {
        Args: {
          development: Json
          requester: string
          target_repository: string
          target_task: string
          target_workspace: string
        }
        Returns: string
      }
      member_management_details: {
        Args: { target_user: string; target_workspace: string }
        Returns: {
          full_name: string
          is_last_admin: boolean
          pending_tasks: number
          role: Database['public']['Enums']['member_role']
          user_id: string
        }[]
      }
      my_invitations: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          expires_at: string
          id: string
          workspace_name: string
        }[]
      }
      prepare_invitation_email: {
        Args: { application_url: string; from_email: string; invitation_id: string; requester_id: string }
        Returns: Json
      }
      receive_github_event: { Args: { delivery: string; event: Json; event_name: string }; Returns: boolean }
      remove_workspace_member: {
        Args: {
          expected_pending_tasks: number
          expected_role: Database['public']['Enums']['member_role']
          replacement_user?: string
          target_user: string
          target_workspace: string
        }
        Returns: {
          action: string
          actor_id: string | null
          actor_name: string
          affected_tasks: number
          created_at: string
          id: string
          member_id: string | null
          member_name: string
          new_role: Database['public']['Enums']['member_role'] | null
          previous_role: Database['public']['Enums']['member_role']
          reassigned_name: string | null
          reassigned_to: string | null
          workspace_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'workspace_member_events'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retry_task_github: { Args: { target_task: string; target_workspace: string }; Returns: string }
      revoke_invitation: {
        Args: { invitation_id: string }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          email: string
          email_job_id: string | null
          email_requested_at: string | null
          email_sent_at: string | null
          email_status: string
          expires_at: string
          id: string
          status: string
          workspace_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'workspace_invitations'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      select_company: { Args: { target_workspace: string }; Returns: string }
      set_project_github_repository: {
        Args: { target_project: string; target_repository: string; target_workspace: string }
        Returns: string
      }
      team_directory: {
        Args: { include_removed?: boolean; search_term?: string; target_workspace: string }
        Returns: {
          assigned_tasks: number
          avatar_url: string
          completed_tasks: number
          full_name: string
          id: string
          is_active: boolean
          job_title: string
          role: Database['public']['Enums']['member_role']
        }[]
      }
      unlink_task_github: { Args: { target_task: string; target_workspace: string }; Returns: string }
    }
    Enums: {
      activity_entity: 'project' | 'task' | 'comment'
      member_role: 'admin' | 'member'
      project_status: 'active' | 'paused' | 'completed' | 'archived'
      registration_email_status: 'available' | 'registered' | 'confirmation_pending'
      task_priority: 'low' | 'medium' | 'high'
      task_status: 'todo' | 'in_progress' | 'review' | 'done'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_entity: ['project', 'task', 'comment'],
      member_role: ['admin', 'member'],
      project_status: ['active', 'paused', 'completed', 'archived'],
      registration_email_status: ['available', 'registered', 'confirmation_pending'],
      task_priority: ['low', 'medium', 'high'],
      task_status: ['todo', 'in_progress', 'review', 'done'],
    },
  },
} as const
