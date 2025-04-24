export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      goals: {
        Row: {
          created_at: string
          goal_text: string | null
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_text?: string | null
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_text?: string | null
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      llm_configs: {
        Row: {
          id: string
          created_at: string
          function_name: string
          api_key: string
          llm_provider: string
          pre_prompt: string
          enable_ai?: boolean
          assistant_name?: string
          personality_type?: string
          voice_gender?: string
        }
        Insert: {
          id?: string
          created_at?: string
          function_name: string
          api_key: string
          llm_provider?: string
          pre_prompt?: string
          enable_ai?: boolean
          assistant_name?: string
          personality_type?: string
          voice_gender?: string
        }
        Update: {
          id?: string
          created_at?: string
          function_name?: string
          api_key?: string
          llm_provider?: string
          pre_prompt?: string
          enable_ai?: boolean
          assistant_name?: string
          personality_type?: string
          voice_gender?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          theme: string | null
          wizard_completed: boolean | null
          nickname: string | null
          selected_issues: string[] | null
          other_issue: string | null
          assistant_toughness: string | null
        }
        Insert: {
          id: string
          created_at?: string | null
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          theme?: string | null
          wizard_completed?: boolean | null
          nickname?: string | null
          selected_issues?: string[] | null
          other_issue?: string | null
          assistant_toughness?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          theme?: string | null
          wizard_completed?: boolean | null
          nickname?: string | null
          selected_issues?: string[] | null
          other_issue?: string | null
          assistant_toughness?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          completed: boolean
          skipped: boolean
          goal_id: string
          user_id: string
          created_at: string
          updated_at: string
          frequency: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          completed?: boolean
          skipped?: boolean
          goal_id: string
          user_id: string
          created_at?: string
          updated_at?: string
          frequency?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          completed?: boolean
          skipped?: boolean
          goal_id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          frequency?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          task_id: string
          completed: boolean
          skipped: boolean
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          completed: boolean
          skipped?: boolean
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          completed?: boolean
          skipped?: boolean
          timestamp?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string | null
          last_message_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          last_message_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          last_message_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          role: string
          content: string
          timestamp: string
          conversation_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          content: string
          timestamp?: string
          conversation_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          content?: string
          timestamp?: string
          conversation_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      manage_user_llm_config: {
        Args: {
          p_function_name: string
          p_assistant_name: string
          p_personality_type: string
          p_pre_prompt: string
          p_voice_gender: string
        }
        Returns: boolean
      }
    }
    Enums: {
      task_frequency:
        | "morning"
        | "afternoon"
        | "evening"
        | "daily"
        | "weekly"
        | "monthly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      task_frequency: [
        "morning",
        "afternoon",
        "evening",
        "daily",
        "weekly",
        "monthly",
      ],
    },
  },
} as const
