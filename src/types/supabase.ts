
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
      llm_configs: {
        Row: {
          id: string
          function_name: string | null
          llm_provider: string | null
          api_key: string | null
          pre_prompt: string | null
          created_at: string
        }
        Insert: {
          id?: string
          function_name?: string | null
          llm_provider?: string | null
          api_key?: string | null
          pre_prompt?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          function_name?: string | null
          llm_provider?: string | null
          api_key?: string | null
          pre_prompt?: string | null
          created_at?: string
        }
      }
    }
  }
}
