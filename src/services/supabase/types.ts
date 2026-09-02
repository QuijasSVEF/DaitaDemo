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
      teachers: {
        Row: {
          username: string
          name: string
          created_at: string
        }
        Insert: {
          username: string
          name: string
          created_at?: string
        }
        Update: {
          username?: string
          name?: string
          created_at?: string
        }
      }
      students: {
        Row: {
          id: number
          grade_level: string
          subject: string
          teacher_username: string
          created_at: string
        }
        Insert: {
          id: number
          grade_level: string
          subject: string
          teacher_username: string
          created_at?: string
        }
        Update: {
          id?: number
          grade_level?: string
          subject?: string
          teacher_username?: string
          created_at?: string
        }
      }
      exit_tickets: {
        Row: {
          id: string
          student_id: number
          teacher_username: string
          score: number
          total_questions: number
          struggled_areas: string[]
          last_lesson: string
          created_at: string
        }
        Insert: {
          id?: string
          student_id: number
          teacher_username: string
          score: number
          total_questions: number
          struggled_areas: string[]
          last_lesson: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: number
          teacher_username?: string
          score?: number
          total_questions?: number
          struggled_areas?: string[]
          last_lesson?: string
          created_at?: string
        }
      }
      lesson_plans: {
        Row: {
          id: string
          student_id: number
          teacher_username: string
          objective: string
          engagement: string[]
          representation: string[]
          action_expression: string[]
          wrapup: string[]
          duration: number
          created_at: string
          detailed_activities: Json | null
          aligned_standards: Json[]
          dok_levels: {
            engagement: number
            representation: number
            action_expression: number
            wrapup: number
          }
          exit_ticket_id: string | null
        }
        Insert: {
          id?: string
          student_id: number
          teacher_username: string
          objective: string
          engagement: string[]
          representation: string[]
          action_expression: string[]
          wrapup: string[]
          duration: number
          created_at?: string
          detailed_activities?: Json | null
          aligned_standards?: Json[]
          dok_levels?: {
            engagement: number
            representation: number
            action_expression: number
            wrapup: number
          }
          exit_ticket_id?: string | null
        }
        Update: {
          id?: string
          student_id?: number
          teacher_username?: string
          objective?: string
          engagement?: string[]
          representation?: string[]
          action_expression?: string[]
          wrapup?: string[]
          duration?: number
          created_at?: string
          detailed_activities?: Json | null
          aligned_standards?: Json[]
          dok_levels?: {
            engagement: number
            representation: number
            action_expression: number
            wrapup: number
          }
          exit_ticket_id?: string | null
        }
      }
      group_lesson_plans: {
        Row: {
          id: string
          group_id: string
          teacher_username: string
          lesson_plan: {
            objective: string
            engagement: string[]
            representation: string[]
            action_expression: string[]
            wrapup: string[]
            duration: number
          }
          student_ids: number[]
          focus_areas: string[]
          unique_id: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          teacher_username: string
          lesson_plan: {
            objective: string
            engagement: string[]
            representation: string[]
            action_expression: string[]
            wrapup: string[]
            duration: number
          }
          student_ids: number[]
          focus_areas: string[]
          unique_id: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          teacher_username?: string
          lesson_plan?: {
            objective: string
            engagement: string[]
            representation: string[]
            action_expression: string[]
            wrapup: string[]
            duration: number
          }
          student_ids?: number[]
          focus_areas?: string[]
          unique_id?: string
          created_at?: string
        }
      }
    }
  }
}