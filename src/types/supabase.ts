
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          goal_id: string
          title: string
          description: string | null
          completed: boolean
          skipped: boolean
          frequency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_id: string
          title: string
          description?: string | null
          completed?: boolean
          skipped?: boolean
          frequency: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string
          title?: string
          description?: string | null
          completed?: boolean
          skipped?: boolean
          frequency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          updated_at: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          updated_at?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          updated_at?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_preferences: {
        Row: {
          user_id: string
          llm_provider: string | null
          enable_ai: boolean
          assistant_name: string | null
          personality_type: string | null
          voice_gender: string | null
          voice_service: string | null
          elevenlabs_voice: string | null
          google_voice: string | null
          azure_voice: string | null
          amazon_voice: string | null
          openai_voice: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          llm_provider?: string | null
          enable_ai?: boolean
          assistant_name?: string | null
          personality_type?: string | null
          voice_gender?: string | null
          voice_service?: string | null
          elevenlabs_voice?: string | null
          google_voice?: string | null
          azure_voice?: string | null
          amazon_voice?: string | null
          openai_voice?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          llm_provider?: string | null
          enable_ai?: boolean
          assistant_name?: string | null
          personality_type?: string | null
          voice_gender?: string | null
          voice_service?: string | null
          elevenlabs_voice?: string | null
          google_voice?: string | null
          azure_voice?: string | null
          amazon_voice?: string | null
          openai_voice?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      goals: {
        Row: {
          id: string
          user_id: string
          goal_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_text?: string | null
          created_at?: string
        }
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string
          content: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string | null
          created_at?: string
        }
      }
    }
  }
}
