export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
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
      action_items: {
        Row: {
          ai_generated: boolean
          created_at: string
          detail: string | null
          due_date: string | null
          edited_by_user: boolean
          id: string
          meeting_id: string
          owner_name: string | null
          position: number
          priority: Database["public"]["Enums"]["action_priority"]
          source_sec: number | null
          source_segment_id: number | null
          status: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean
          created_at?: string
          detail?: string | null
          due_date?: string | null
          edited_by_user?: boolean
          id?: string
          meeting_id: string
          owner_name?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["action_priority"]
          source_sec?: number | null
          source_segment_id?: number | null
          status?: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean
          created_at?: string
          detail?: string | null
          due_date?: string | null
          edited_by_user?: boolean
          id?: string
          meeting_id?: string
          owner_name?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["action_priority"]
          source_sec?: number | null
          source_segment_id?: number | null
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_source_segment_id_fkey"
            columns: ["source_segment_id"]
            isOneToOne: false
            referencedRelation: "transcript_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_queries: {
        Row: {
          answer: string
          citations: Json
          created_at: string
          id: string
          meeting_id: string
          question: string
          user_id: string
        }
        Insert: {
          answer: string
          citations?: Json
          created_at?: string
          id?: string
          meeting_id: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string
          citations?: Json
          created_at?: string
          id?: string
          meeting_id?: string
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_queries_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_chunks: {
        Row: {
          attempts: number
          chunk_index: number
          created_at: string
          duration_sec: number
          id: string
          last_error: string | null
          meeting_id: string
          size_bytes: number | null
          start_sec: number
          status: Database["public"]["Enums"]["chunk_status"]
          storage_path: string
          user_id: string
        }
        Insert: {
          attempts?: number
          chunk_index: number
          created_at?: string
          duration_sec: number
          id?: string
          last_error?: string | null
          meeting_id: string
          size_bytes?: number | null
          start_sec: number
          status?: Database["public"]["Enums"]["chunk_status"]
          storage_path: string
          user_id: string
        }
        Update: {
          attempts?: number
          chunk_index?: number
          created_at?: string
          duration_sec?: number
          id?: string
          last_error?: string | null
          meeting_id?: string
          size_bytes?: number | null
          start_sec?: number
          status?: Database["public"]["Enums"]["chunk_status"]
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_chunks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_chunks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_drafts: {
        Row: {
          body_md: string
          created_at: string
          edited_by_user: boolean
          meeting_id: string
          recipients: Json
          subject: string
          tone: Database["public"]["Enums"]["email_tone"]
          updated_at: string
          user_id: string
        }
        Insert: {
          body_md: string
          created_at?: string
          edited_by_user?: boolean
          meeting_id: string
          recipients?: Json
          subject: string
          tone?: Database["public"]["Enums"]["email_tone"]
          updated_at?: string
          user_id: string
        }
        Update: {
          body_md?: string
          created_at?: string
          edited_by_user?: boolean
          meeting_id?: string
          recipients?: Json
          subject?: string
          tone?: Database["public"]["Enums"]["email_tone"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          audio_purged_at: string | null
          chunk_count: number
          created_at: string
          duration_sec: number
          error_code: string | null
          error_message: string | null
          id: string
          language: string
          meeting_date: string
          pinned: boolean
          resume_at: string | null
          stage_detail: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_purged_at?: string | null
          chunk_count: number
          created_at?: string
          duration_sec: number
          error_code?: string | null
          error_message?: string | null
          id?: string
          language?: string
          meeting_date?: string
          pinned?: boolean
          resume_at?: string | null
          stage_detail?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_purged_at?: string | null
          chunk_count?: number
          created_at?: string
          duration_sec?: number
          error_code?: string | null
          error_message?: string | null
          id?: string
          language?: string
          meeting_date?: string
          pinned?: boolean
          resume_at?: string | null
          stage_detail?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_tone: Database["public"]["Enums"]["email_tone"]
          email: string
          full_name: string | null
          id: string
          retention_days: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_tone?: Database["public"]["Enums"]["email_tone"]
          email: string
          full_name?: string | null
          id: string
          retention_days?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_tone?: Database["public"]["Enums"]["email_tone"]
          email?: string
          full_name?: string | null
          id?: string
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string
          expires_at: string | null
          include_transcript: boolean
          meeting_id: string
          revoked_at: string | null
          token: string
          user_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          include_transcript?: boolean
          meeting_id: string
          revoked_at?: string | null
          token: string
          user_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          include_transcript?: boolean
          meeting_id?: string
          revoked_at?: string | null
          token?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "share_links_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          attendees: Json
          created_at: string
          decisions: Json
          edited_by_user: boolean
          meeting_id: string
          model: string
          open_questions: Json
          overview: string
          topics: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          attendees?: Json
          created_at?: string
          decisions?: Json
          edited_by_user?: boolean
          meeting_id: string
          model: string
          open_questions?: Json
          overview: string
          topics?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          attendees?: Json
          created_at?: string
          decisions?: Json
          edited_by_user?: boolean
          meeting_id?: string
          model?: string
          open_questions?: Json
          overview?: string
          topics?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "summaries_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_segments: {
        Row: {
          chunk_index: number
          created_at: string
          end_sec: number
          id: number
          meeting_id: string
          seq: number
          speaker: string | null
          start_sec: number
          text: string
          user_id: string
        }
        Insert: {
          chunk_index: number
          created_at?: string
          end_sec: number
          id?: never
          meeting_id: string
          seq: number
          speaker?: string | null
          start_sec: number
          text: string
          user_id: string
        }
        Update: {
          chunk_index?: number
          created_at?: string
          end_sec?: number
          id?: never
          meeting_id?: string
          seq?: number
          speaker?: string | null
          start_sec?: number
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_segments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_segments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_daily: {
        Row: {
          asr_calls: number
          audio_seconds: number
          day: string
          llm_calls: number
          llm_tokens: number
          user_id: string
        }
        Insert: {
          asr_calls?: number
          audio_seconds?: number
          day?: string
          llm_calls?: number
          llm_tokens?: number
          user_id: string
        }
        Update: {
          asr_calls?: number
          audio_seconds?: number
          day?: string
          llm_calls?: number
          llm_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_usage_daily: {
        Args: { p_asr_calls: number; p_audio_seconds: number; p_day: string }
        Returns: undefined
      }
    }
    Enums: {
      action_priority: "low" | "medium" | "high"
      action_status: "todo" | "in_progress" | "done"
      chunk_status: "pending" | "uploaded" | "processing" | "done" | "failed"
      email_tone: "professional" | "friendly" | "brief"
      meeting_status:
        | "draft"
        | "uploading"
        | "transcribing"
        | "analyzing"
        | "ready"
        | "failed"
        | "quota_blocked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      action_priority: ["low", "medium", "high"],
      action_status: ["todo", "in_progress", "done"],
      chunk_status: ["pending", "uploaded", "processing", "done", "failed"],
      email_tone: ["professional", "friendly", "brief"],
      meeting_status: [
        "draft",
        "uploading",
        "transcribing",
        "analyzing",
        "ready",
        "failed",
        "quota_blocked",
      ],
    },
  },
} as const
