export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
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
      notifications: {
        Row: {
          actor_id: string | null
          actor_name: string
          created_at: string
          event_id: string
          id: string
          kind: Database['public']['Enums']['notification_kind']
          project_id: string
          read_at: string | null
          recipient_id: string
          task_id: string
          task_status: Database['public']['Enums']['task_status'] | null
          task_title: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          actor_id?: string | null
          actor_name: string
          created_at?: string
          event_id: string
          id?: string
          kind: Database['public']['Enums']['notification_kind']
          project_id: string
          read_at?: string | null
          recipient_id: string
          task_id: string
          task_status?: Database['public']['Enums']['task_status'] | null
          task_title: string
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          event_id?: string
          id?: string
          kind?: Database['public']['Enums']['notification_kind']
          project_id?: string
          read_at?: string | null
          recipient_id?: string
          task_id?: string
          task_status?: Database['public']['Enums']['task_status'] | null
          task_title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_recipient_id_fkey'
            columns: ['recipient_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_workspace_id_project_id_fkey'
            columns: ['workspace_id', 'project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['workspace_id', 'id']
          },
          {
            foreignKeyName: 'notifications_workspace_id_task_id_fkey'
            columns: ['workspace_id', 'task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['workspace_id', 'id']
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
          deleted_at: string | null
          deleted_by: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
            foreignKeyName: 'projects_deleted_by_fkey'
            columns: ['deleted_by']
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
            foreignKeyName: 'task_github_links_repository_fkey'
            columns: ['workspace_id', 'repository_id']
            isOneToOne: false
            referencedRelation: 'github_repositories'
            referencedColumns: ['workspace_id', 'id']
          },
          {
            foreignKeyName: 'task_github_links_task_fkey'
            columns: ['workspace_id', 'project_id', 'task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['workspace_id', 'project_id', 'id']
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
            foreignKeyName: 'tasks_deleted_by_fkey'
            columns: ['deleted_by']
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
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspaces_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { invitation_id: string }; Returns: string }
      advance_github_account_connection: {
        Args: { next_hash: string; previous_hash: string; requester: string; target_installation: number }
        Returns: undefined
      }
      apply_github_snapshot: { Args: { job_lease: string; snapshot: Json; target_link: string }; Returns: Json }
      begin_github_account_connection: {
        Args: { requester: string; state_hash: string; target_workspace: string }
        Returns: undefined
      }
      begin_github_connection: {
        Args: { repository_name: string; requester: string; state_hash: string; target_workspace: string }
        Returns: undefined
      }
      begin_github_discovery: {
        Args: { available_installations?: number[]; requester: string; state_hash: string; target_workspace: string }
        Returns: undefined
      }
      begin_github_repository_selection: {
        Args: {
          available_repositories: number[]
          requester: string
          state_hash: string
          target_installation: number
          target_workspace: string
        }
        Returns: Json
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
      clear_project_github_repository: { Args: { target_project: string; target_workspace: string }; Returns: string }
      complete_ai_task_request: {
        Args: { clarification?: string; draft: Json; lease: string; request_id: string }
        Returns: Json
      }
      consume_github_account_connection: { Args: { requester: string; state_hash: string }; Returns: Json }
      consume_github_connection: { Args: { requester: string; state_hash: string }; Returns: Json }
      consume_github_discovery: { Args: { requester: string; state_hash: string }; Returns: string }
      consume_github_repository_selection: { Args: { requester: string; state_hash: string }; Returns: Json }
      create_company: {
        Args: { company_name: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
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
      delete_company: { Args: { confirmation: string; target_workspace: string }; Returns: string }
      delete_project: { Args: { target_project: string; target_workspace: string }; Returns: string }
      delete_task: { Args: { target_task: string; target_workspace: string }; Returns: string }
      deleted_companies: {
        Args: Record<PropertyKey, never>
        Returns: {
          deleted_at: string
          id: string
          name: string
          purge_at: string
        }[]
      }
      disconnect_github_repository: { Args: { target_repository: string; target_workspace: string }; Returns: string }
      fail_ai_task_request: { Args: { lease: string; request_id: string }; Returns: boolean }
      finish_github_account_connection: {
        Args: { repositories: Json; requester: string; target_workspace: string }
        Returns: number
      }
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
      mark_all_notifications_read: { Args: { target_workspace: string; through_time: string }; Returns: number }
      mark_notification_read: {
        Args: { notification_id: string; target_workspace: string }
        Returns: {
          actor_id: string | null
          actor_name: string
          created_at: string
          event_id: string
          id: string
          kind: Database['public']['Enums']['notification_kind']
          project_id: string
          read_at: string | null
          recipient_id: string
          task_id: string
          task_status: Database['public']['Enums']['task_status'] | null
          task_title: string
          workspace_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'notifications'
          isOneToOne: true
          isSetofReturn: false
        }
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
      notification_inbox: {
        Args: { before_id?: string; before_time?: string; target_workspace: string; unread_only?: boolean }
        Returns: Json
      }
      prepare_ai_task_request: {
        Args: { prompt_hash: string; request_id: string; target_project: string; target_workspace: string }
        Returns: Json
      }
      prepare_invitation_email: {
        Args: { application_url: string; from_email: string; invitation_id: string; requester_id: string }
        Returns: Json
      }
      purge_project: { Args: { target_project: string; target_workspace: string }; Returns: string }
      purge_task: { Args: { target_task: string; target_workspace: string }; Returns: string }
      receive_github_event: { Args: { delivery: string; event: Json; event_name: string }; Returns: boolean }
      reject_ai_task_request: { Args: { lease: string; reason: string; request_id: string }; Returns: Json }
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
      rename_company: {
        Args: { company_name: string; target_workspace: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
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
      restore_company: { Args: { target_workspace: string }; Returns: string }
      restore_project: { Args: { target_project: string; target_workspace: string }; Returns: string }
      restore_task: { Args: { target_task: string; target_workspace: string }; Returns: string }
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
      save_github_repository_selection: {
        Args: {
          previous_ids: number[]
          repositories: Json
          requester: string
          target_installation: number
          target_workspace: string
        }
        Returns: number
      }
      select_company: { Args: { target_workspace: string }; Returns: string }
      select_github_installation: {
        Args: { next_hash: string; requester: string; state_hash: string; target_installation?: number }
        Returns: undefined
      }
      select_github_repositories: {
        Args: { next_hash: string; repository_ids: number[]; requester: string; state_hash: string }
        Returns: undefined
      }
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
      trash_items: { Args: { target_workspace: string }; Returns: Json }
      unlink_task_github: { Args: { target_task: string; target_workspace: string }; Returns: string }
    }
    Enums: {
      activity_entity: 'project' | 'task' | 'comment'
      member_role: 'admin' | 'member'
      notification_kind: 'assigned' | 'commented' | 'status_changed'
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
  public: {
    Enums: {
      activity_entity: ['project', 'task', 'comment'],
      member_role: ['admin', 'member'],
      notification_kind: ['assigned', 'commented', 'status_changed'],
      project_status: ['active', 'paused', 'completed', 'archived'],
      registration_email_status: ['available', 'registered', 'confirmation_pending'],
      task_priority: ['low', 'medium', 'high'],
      task_status: ['todo', 'in_progress', 'review', 'done'],
    },
  },
} as const
