
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
    }
  }
}
